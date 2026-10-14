"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { requireAdminForAction } from "@/lib/admin/guards";
import { isUuid } from "@/lib/admin/orders";
import { PAUSE_OPTIONS } from "@/lib/ordering/limits";
import { readOrderingSettings, SETTINGS_TAG } from "@/lib/ordering/menu";
import { resendOrderReceipt, sendCancellationEmail, sendReadyEmail } from "@/lib/ordering/order-mailer";
import type { OrderStatus } from "@/lib/ordering/orders";
import { refundOrderInFull } from "@/lib/ordering/refunds";
import { supabase as serverSupabase } from "@/lib/supabase-server";

export type KitchenActionResult = { ok: true } | { ok: false; message: string };
export type CancelResult = { ok: true; emailed: boolean } | { ok: false; message: string };

// Mirrors fk_guard_order_update in 003_ordering.sql, which enforces it again in the database.
const MOVES: Record<string, { to: OrderStatus; stamp?: string }[]> = {
  confirmed: [{ to: "preparing", stamp: "prepared_at" }],
  preparing: [{ to: "ready_for_collection", stamp: "ready_at" }, { to: "confirmed" }],
  ready_for_collection: [{ to: "completed", stamp: "completed_at" }, { to: "preparing" }],
};

async function kitchenAuth() {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;
  if (!auth.ctx.adminUser.canManageOrders) {
    return { ok: false as const, message: "You don't have access to orders." };
  }
  return auth;
}

export async function moveOrderAction(orderId: string, from: OrderStatus, to: OrderStatus): Promise<KitchenActionResult> {
  const auth = await kitchenAuth();
  if (!auth.ok) return auth;
  if (!isUuid(orderId)) return { ok: false, message: "We couldn't find that order." };

  const move = MOVES[from]?.find((option) => option.to === to);
  if (!move) return { ok: false, message: "That order can't move there." };

  const { data, error } = await auth.ctx.supabase
    .from("orders")
    .update({ order_status: to, ...(move.stamp && { [move.stamp]: new Date().toISOString() }) })
    .eq("id", orderId)
    .eq("order_status", from)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: "We couldn't update that order. Try again." };
  refresh();
  if (!data) return { ok: false, message: "Someone else has just updated this order." };

  if (to === "ready_for_collection") {
    after(async () => {
      const settings = await readOrderingSettings(serverSupabase).catch(() => null);
      if (settings?.readyEmailEnabled) await sendReadyEmail(orderId);
    });
  }
  return { ok: true };
}

export async function cancelOrderAction(orderId: string, reason: string): Promise<CancelResult> {
  const auth = await kitchenAuth();
  if (!auth.ok) return auth;
  if (!isUuid(orderId)) return { ok: false, message: "We couldn't find that order." };
  const { supabase } = auth.ctx;

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, message: "We couldn't find that order." };
  if (order.order_status === "completed" || order.order_status === "cancelled") {
    return { ok: false, message: "This order is already finished." };
  }

  // Money first: the database refuses to cancel a paid order until it is fully refunded.
  let refund;
  try {
    refund = await refundOrderInFull(orderId);
  } catch (error) {
    console.error("[kitchen] Refund failed:", (error as { message?: string })?.message);
    return { ok: false, message: "Stripe couldn't refund this order. Nothing was cancelled. Try again." };
  }
  if (!refund.ok) {
    refresh();
    return refund;
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      order_status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason.trim().slice(0, 200) || "Cancelled by the kitchen",
    })
    .eq("id", orderId)
    .eq("order_status", order.order_status)
    .select("id")
    .maybeSingle();

  refresh();
  if (error || !data) {
    return { ok: false, message: "The refund went through, but we couldn't mark the order cancelled. Try again." };
  }
  const emailed = await sendCancellationEmail(orderId);
  return { ok: true, emailed };
}

/** Resends the customer's receipt if it never went out; never sends it twice. */
export async function resendReceiptAction(orderId: string): Promise<KitchenActionResult> {
  const auth = await kitchenAuth();
  if (!auth.ok) return auth;
  if (!isUuid(orderId)) return { ok: false, message: "We couldn't find that order." };

  // RLS check first: the mailer reads with the secret key.
  const { data } = await auth.ctx.supabase.from("orders").select("id").eq("id", orderId).maybeSingle();
  if (!data) return { ok: false, message: "We couldn't find that order." };

  const result = await resendOrderReceipt(orderId);
  refresh();
  if (result === "sent" || result === "already-sent") return { ok: true };
  if (result === "not-paid") return { ok: false, message: "This order isn't paid, so there's no receipt to send." };
  return { ok: false, message: "The email didn't send. Try again in a few minutes." };
}

async function pauseAuth() {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;
  const { adminUser } = auth.ctx;
  if (!adminUser.canManageOrders && !adminUser.canManageMenus) {
    return { ok: false as const, message: "You don't have access to ordering settings." };
  }
  return auth;
}

async function setPausedUntil(client: SupabaseClient, value: string | null): Promise<KitchenActionResult> {
  const { data, error } = await client
    .from("business_settings")
    .update({ paused_until: value })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "We couldn't change that. Try again." };
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true };
}

/** Pauses ASAP orders for a few minutes; they resume by themselves when the time is up. */
export async function pauseOrderingAction(minutes: number): Promise<KitchenActionResult> {
  const auth = await pauseAuth();
  if (!auth.ok) return auth;
  if (!(PAUSE_OPTIONS as readonly number[]).includes(minutes)) return { ok: false, message: "Choose 15, 30 or 60 minutes." };
  return setPausedUntil(auth.ctx.supabase, new Date(Date.now() + minutes * 60_000).toISOString());
}

export async function resumeOrderingAction(): Promise<KitchenActionResult> {
  const auth = await pauseAuth();
  if (!auth.ok) return auth;
  return setPausedUntil(auth.ctx.supabase, null);
}
