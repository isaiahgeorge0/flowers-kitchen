import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase-server";
import { toPence, toPounds } from "./money";

// Ported from the template's services/stripe/process-stripe-refund.ts: a refund ledger fed by
// Stripe webhooks and by the kitchen's cancel button, with the order's refund summary recomputed
// from the ledger every time.

type RefundLedgerStatus = "pending" | "succeeded" | "failed" | "cancelled";

function mapStripeRefundStatus(status: string | null): RefundLedgerStatus {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function upsertOrderRefund(refund: Stripe.Refund, orderId: string) {
  const status = mapStripeRefundStatus(refund.status);
  const { error } = await supabase.from("order_refunds").upsert(
    {
      order_id: orderId,
      stripe_refund_id: refund.id,
      stripe_payment_intent_id: idOf(refund.payment_intent),
      amount: toPounds(refund.amount),
      currency: (refund.currency ?? "gbp").toUpperCase(),
      status,
      reason: typeof refund.reason === "string" ? refund.reason : null,
      payload_json: refund as unknown as Record<string, unknown>,
      processed_at: status === "succeeded" ? new Date().toISOString() : null,
    },
    { onConflict: "stripe_refund_id" },
  );
  if (error) throw new Error(`ORDER_REFUND_UPSERT_FAILED:${error.message}`);
}

/** Recomputes refunded_total, refund_status and payment_refunded_at from the ledger. */
export async function recomputeOrderRefundSummary(orderId: string) {
  const order = await supabase
    .from("orders")
    .select("total_amount, payment_refunded_at")
    .eq("id", orderId)
    .maybeSingle();
  if (order.error || !order.data) throw new Error("ORDER_NOT_FOUND_FOR_REFUND_RECOMPUTE");

  const ledger = await supabase.from("order_refunds").select("amount, status, processed_at").eq("order_id", orderId);
  if (ledger.error) throw new Error(`ORDER_REFUND_LEDGER_READ_FAILED:${ledger.error.message}`);

  let succeededPence = 0;
  let earliest: string | null = null;
  for (const row of ledger.data) {
    if (row.status !== "succeeded") continue;
    succeededPence += toPence(row.amount);
    if (row.processed_at && (!earliest || row.processed_at < earliest)) earliest = row.processed_at;
  }

  const totalPence = toPence(order.data.total_amount);
  const refundStatus = succeededPence <= 0 ? "none" : succeededPence >= totalPence ? "full" : "partial";

  const update: Record<string, unknown> = { refunded_total: toPounds(succeededPence), refund_status: refundStatus };
  if (succeededPence > 0) {
    update.payment_refunded_at = earliest ?? order.data.payment_refunded_at ?? new Date().toISOString();
  }
  if (refundStatus === "full") update.payment_status = "refunded";

  const { error } = await supabase.from("orders").update(update).eq("id", orderId);
  if (error) throw new Error(`ORDER_REFUND_SUMMARY_UPDATE_FAILED:${error.message}`);
  return refundStatus;
}

async function findOrderForRefund(metadataOrderId: string | null, paymentIntentId: string | null) {
  if (metadataOrderId) {
    const { data } = await supabase.from("orders").select("id").eq("id", metadataOrderId).maybeSingle();
    if (data) return data.id as string;
  }
  if (paymentIntentId) {
    const { data } = await supabase.from("orders").select("id").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
    if (data) return data.id as string;
  }
  return null;
}

/** refund.created / refund.updated */
export async function handleRefundEvent(event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund;
  let paymentIntentId = idOf(refund.payment_intent);
  if (!paymentIntentId) {
    const chargeId = idOf(refund.charge);
    if (chargeId) {
      const charge = await getStripe().charges.retrieve(chargeId).catch(() => null);
      paymentIntentId = idOf(charge?.payment_intent);
    }
  }
  const orderId = await findOrderForRefund(refund.metadata?.order_id ?? null, paymentIntentId);
  if (!orderId) throw new Error("ORDER_NOT_FOUND_FOR_REFUND");
  await upsertOrderRefund(refund, orderId);
  await recomputeOrderRefundSummary(orderId);
  return orderId;
}

/** charge.refunded: reconcile every refund on the charge. */
export async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const orderId = await findOrderForRefund(null, idOf(charge.payment_intent));
  if (!orderId) throw new Error("ORDER_NOT_FOUND_FOR_CHARGE_REFUNDED");
  const refunds = await getStripe().refunds.list({ charge: charge.id, limit: 100 });
  for (const refund of refunds.data) await upsertOrderRefund(refund, orderId);
  await recomputeOrderRefundSummary(orderId);
  return orderId;
}

export type RefundResult = { ok: true } | { ok: false; message: string };

/**
 * Refunds whatever is left on a paid order. Safe to call again: existing refunds are synced
 * first and Stripe's idempotency key stops a second refund for the same amount.
 */
export async function refundOrderInFull(orderId: string): Promise<RefundResult> {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, payment_status, refund_status, stripe_payment_intent_id, total_amount, refunded_total")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, message: "We couldn't find that order." };
  if (order.payment_status !== "paid" && order.payment_status !== "refunded") return { ok: true };
  if (order.refund_status === "full") return { ok: true };
  if (!order.stripe_payment_intent_id) {
    return { ok: false, message: "This order has no card payment to refund. Refund it in the Stripe dashboard." };
  }

  const stripe = getStripe();
  const existing = await stripe.refunds.list({ payment_intent: order.stripe_payment_intent_id, limit: 100 });
  for (const refund of existing.data) await upsertOrderRefund(refund, orderId);
  if ((await recomputeOrderRefundSummary(orderId)) === "full") return { ok: true };
  if (existing.data.some((refund) => refund.status === "pending")) {
    return { ok: false, message: "A refund is still processing. Try again in a minute." };
  }

  const succeededPence = existing.data
    .filter((refund) => refund.status === "succeeded")
    .reduce((sum, refund) => sum + refund.amount, 0);
  const remainingPence = toPence(order.total_amount) - succeededPence;
  if (remainingPence <= 0) return { ok: true };

  const refund = await stripe.refunds.create(
    {
      payment_intent: order.stripe_payment_intent_id,
      amount: remainingPence,
      reason: "requested_by_customer",
      metadata: { order_id: orderId, order_number: String(order.order_number) },
    },
    { idempotencyKey: `refund-order-${orderId}-${remainingPence}` },
  );
  await upsertOrderRefund(refund, orderId);
  const status = await recomputeOrderRefundSummary(orderId);
  if (status === "full") return { ok: true };
  return { ok: false, message: "The refund is processing. Try cancelling again in a minute." };
}
