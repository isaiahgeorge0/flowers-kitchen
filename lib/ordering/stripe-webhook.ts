import "server-only";
import type Stripe from "stripe";
import { supabase } from "@/lib/supabase-server";
import { readOrderingSettings } from "./menu";
import { toPence } from "./money";
import { sendOrderEmails } from "./order-mailer";
import { handleChargeRefunded, handleRefundEvent, refundOrderInFull } from "./refunds";
import { isOverSlotCapacity } from "./slot-capacity";
import { isIgnored, metadataOrderId, unmatched, type HandlerOutcome, type IgnoreReason } from "./webhook-outcome";

// Ported from the template's services/stripe/process-webhook-event.ts. Every event is recorded
// once in stripe_webhook_events (unique Stripe event id); a retry of an event that already
// succeeded (or was ignored) is a no-op, a retry of one that failed runs again. Each handler is
// idempotent too. Events for objects that aren't site orders are ignored with a 200; only real
// failures (Supabase, Stripe API) return 500 so Stripe retries them.

const IS_DEV = process.env.NODE_ENV !== "production";

export type WebhookResult =
  | { ok: true; duplicate: boolean; ignored?: IgnoreReason }
  | { ok: false; duplicate: boolean; message: string };

function log(message: string, data?: Record<string, unknown>) {
  if (IS_DEV) console.info(`[stripe/webhook] ${message}`, data ?? {});
}

function describe(error: unknown) {
  if (error && typeof error === "object") {
    const { name, message, code } = error as Record<string, unknown>;
    return { name, message, code };
  }
  return { message: String(error) };
}

type OrderPaymentRow = {
  id: string;
  order_number: number;
  total_amount: number | string;
  order_status: string;
  payment_status: string;
  collection_lead_minutes: number;
  collection_type: string;
  scheduled_for: string | null;
};

const ORDER_PAYMENT_SELECT =
  "id, order_number, total_amount, order_status, payment_status, collection_lead_minutes, collection_type, scheduled_for";

async function findOrder(refs: { orderId?: string | null; paymentIntentId?: string | null; sessionId?: string | null }) {
  const lookups: [string, string | null | undefined][] = [
    ["id", refs.orderId],
    ["stripe_payment_intent_id", refs.paymentIntentId],
    ["stripe_checkout_session_id", refs.sessionId],
  ];
  for (const [column, value] of lookups) {
    if (!value) continue;
    const { data, error } = await supabase.from("orders").select(ORDER_PAYMENT_SELECT).eq(column, value).maybeSingle();
    if (error) throw new Error(`ORDER_LOOKUP_FAILED:${error.message}`);
    if (data) return data as OrderPaymentRow;
  }
  return null;
}

const idOf = (value: string | { id: string } | null | undefined) =>
  !value ? null : typeof value === "string" ? value : value.id;

/** A paid scheduled order whose slot filled up while the customer was paying stays, flagged for the kitchen. */
async function flagIfOverCapacity(order: OrderPaymentRow) {
  if (order.collection_type !== "scheduled" || !order.scheduled_for) return;
  try {
    const settings = await readOrderingSettings(supabase);
    const over = await isOverSlotCapacity({ id: order.id, scheduledFor: order.scheduled_for }, settings);
    if (!over) return;
    await supabase.from("orders").update({ slot_over_capacity: true }).eq("id", order.id);
    console.warn(`[stripe/webhook] Order #${order.order_number} was paid into a full collection slot; flagged.`);
  } catch (error) {
    console.error(`[stripe/webhook] Could not check slot capacity for #${order.order_number}:`, describe(error));
  }
}

/** Marks an order paid and confirmed, once. The amount must match what the server priced. */
async function markOrderPaid(
  order: OrderPaymentRow,
  payment: { paymentIntentId: string | null; sessionId?: string; amountPence: number | null; currency: string | null },
) {
  if (payment.amountPence !== toPence(order.total_amount)) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  if (payment.currency?.toLowerCase() !== "gbp") throw new Error("PAYMENT_CURRENCY_MISMATCH");

  const refs = {
    payment_provider: "stripe",
    ...(payment.paymentIntentId && { stripe_payment_intent_id: payment.paymentIntentId }),
    ...(payment.sessionId && { stripe_checkout_session_id: payment.sessionId }),
  };

  if (order.payment_status === "paid" || order.payment_status === "refunded") {
    await supabase.from("orders").update(refs).eq("id", order.id);
    return;
  }

  const now = new Date();
  const confirm = order.order_status === "pending";
  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      ...refs,
      payment_status: "paid",
      payment_confirmed_at: now.toISOString(),
      payment_failed_at: null,
      payment_failure_reason: null,
      ...(confirm && {
        order_status: "confirmed",
        confirmed_at: now.toISOString(),
        estimated_ready_at:
          order.collection_type === "scheduled" && order.scheduled_for
            ? new Date(order.scheduled_for).toISOString()
            : new Date(now.getTime() + order.collection_lead_minutes * 60_000).toISOString(),
      }),
    })
    .eq("id", order.id)
    .in("payment_status", ["unpaid", "failed"])
    .select("id");
  if (error) throw new Error(`ORDER_UPDATE_FAILED:${error.message}`);
  if (!updated?.length) return; // Another event got there first.

  log("order paid", { orderNumber: order.order_number, confirmed: confirm });

  if (order.order_status === "cancelled") {
    // Paid after the order was closed (e.g. an old tab): give the money straight back.
    const refund = await refundOrderInFull(order.id);
    console.warn(`[stripe/webhook] Order #${order.order_number} was paid after it was cancelled; refunded:`, refund.ok);
    return;
  }
  await flagIfOverCapacity(order);
  await sendOrderEmails(order.id);
}

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<HandlerOutcome> {
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentIntentId = idOf(session.payment_intent);
  const orderId = metadataOrderId(session.metadata);
  const order = await findOrder({ orderId, paymentIntentId, sessionId: session.id });
  if (!order) return unmatched(event, orderId);
  if (session.payment_status !== "paid") {
    await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: session.id, stripe_payment_intent_id: paymentIntentId })
      .eq("id", order.id);
    return order.id;
  }
  await markOrderPaid(order, {
    paymentIntentId,
    sessionId: session.id,
    amountPence: session.amount_total,
    currency: session.currency,
  });
  return order.id;
}

async function handleCheckoutSessionExpired(event: Stripe.Event): Promise<HandlerOutcome> {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = metadataOrderId(session.metadata);
  const order = await findOrder({ orderId, sessionId: session.id });
  if (!order) return unmatched(event, orderId);
  await supabase
    .from("orders")
    .update({ order_status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Checkout expired before payment" })
    .eq("id", order.id)
    .eq("order_status", "pending")
    .in("payment_status", ["unpaid", "failed"]);
  return order.id;
}

async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<HandlerOutcome> {
  const intent = event.data.object as Stripe.PaymentIntent;
  const orderId = metadataOrderId(intent.metadata);
  const order = await findOrder({ orderId, paymentIntentId: intent.id });
  if (!order) return unmatched(event, orderId);
  await markOrderPaid(order, { paymentIntentId: intent.id, amountPence: intent.amount_received, currency: intent.currency });
  return order.id;
}

async function handlePaymentIntentFailed(event: Stripe.Event): Promise<HandlerOutcome> {
  const intent = event.data.object as Stripe.PaymentIntent;
  const orderId = metadataOrderId(intent.metadata);
  const order = await findOrder({ orderId, paymentIntentId: intent.id });
  if (!order) return unmatched(event, orderId);
  // Checkout lets the customer try another card, so this only records the attempt.
  await supabase
    .from("orders")
    .update({
      stripe_payment_intent_id: intent.id,
      payment_status: "failed",
      payment_failed_at: new Date().toISOString(),
      payment_failure_reason: intent.last_payment_error?.message?.slice(0, 300) ?? "Payment failed",
    })
    .eq("id", order.id)
    .in("payment_status", ["unpaid", "failed"]);
  return order.id;
}

type LedgerStatus = "processing" | "processed" | "ignored" | "failed";

async function markEvent(stripeEventId: string, status: LedgerStatus, extra: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      processing_status: status,
      ...((status === "processed" || status === "ignored") && {
        processed_at: new Date().toISOString(),
        failure_reason: null,
      }),
      ...extra,
    })
    .eq("stripe_event_id", stripeEventId);
  return error;
}

async function markIgnored(stripeEventId: string, reason: IgnoreReason) {
  const error = await markEvent(stripeEventId, "ignored", { failure_reason: reason });
  // Until migration 005 is applied the check constraint rejects 'ignored' (23514).
  if (error?.code === "23514") await markEvent(stripeEventId, "processed", { failure_reason: `ignored: ${reason}` });
}

export async function processStripeWebhookEvent(event: Stripe.Event): Promise<WebhookResult> {
  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processing_status: "received",
    payload_json: event as unknown as Record<string, unknown>,
  });

  let duplicate = false;
  if (insertError?.code === "23505") {
    duplicate = true;
    const { data } = await supabase
      .from("stripe_webhook_events")
      .select("processing_status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (data?.processing_status === "processed" || data?.processing_status === "ignored") return { ok: true, duplicate };
  } else if (insertError) {
    console.error("[stripe/webhook] Could not record event:", describe(insertError));
    return { ok: false, duplicate, message: "EVENT_PERSIST_FAILED" };
  }

  await markEvent(event.id, "processing");

  try {
    let outcome: HandlerOutcome = null;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        outcome = await handleCheckoutSessionCompleted(event);
        break;
      case "checkout.session.expired":
        outcome = await handleCheckoutSessionExpired(event);
        break;
      case "payment_intent.succeeded":
        outcome = await handlePaymentIntentSucceeded(event);
        break;
      case "payment_intent.payment_failed":
        outcome = await handlePaymentIntentFailed(event);
        break;
      case "refund.created":
      case "refund.updated":
        outcome = await handleRefundEvent(event);
        break;
      case "charge.refunded":
        outcome = await handleChargeRefunded(event);
        break;
      default:
        log("event recorded only", { type: event.type });
    }
    if (isIgnored(outcome)) {
      log("event ignored", { type: event.type, reason: outcome.reason });
      await markIgnored(event.id, outcome.reason);
      return { ok: true, duplicate, ignored: outcome.reason };
    }
    await markEvent(event.id, "processed", { related_order_id: outcome });
    return { ok: true, duplicate };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook processing failure";
    console.error(`[stripe/webhook] ${event.type} ${event.id} failed:`, message);
    await markEvent(event.id, "failed", { failure_reason: message.slice(0, 500) });
    return { ok: false, duplicate, message };
  }
}
