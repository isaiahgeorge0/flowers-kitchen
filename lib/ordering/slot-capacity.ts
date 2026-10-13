import "server-only";
import { supabase } from "@/lib/supabase-server";
import { buildSchedule, scheduleRange } from "./schedule";
import type { OrderingSettings } from "./types";

type HeldRow = {
  scheduled_for: string;
  payment_status: string;
  stripe_session_expires_at: string | null;
  checkout_idempotency_key: string | null;
};

/**
 * Collection times already taken: paid orders, plus unpaid ones whose Stripe session is still
 * open (a customer is paying for that slot right now). `excludeNonce` leaves out the customer's
 * own earlier attempts from this checkout visit.
 */
export async function takenSlotTimes(range: { from: string; to: string }, excludeNonce?: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("scheduled_for, payment_status, stripe_session_expires_at, checkout_idempotency_key")
    .eq("collection_type", "scheduled")
    .neq("order_status", "cancelled")
    .gte("scheduled_for", range.from)
    .lt("scheduled_for", range.to)
    .limit(5000);
  if (error) throw error;

  const now = Date.now();
  return (data as HeldRow[])
    .filter((row) => {
      if (row.payment_status === "paid") return true;
      if (row.payment_status !== "unpaid" && row.payment_status !== "failed") return false;
      if (excludeNonce && row.checkout_idempotency_key?.startsWith(`${excludeNonce}:`)) return false;
      return row.stripe_session_expires_at !== null && Date.parse(row.stripe_session_expires_at) > now;
    })
    .map((row) => Date.parse(row.scheduled_for));
}

/** The schedule with live capacity, for the time picker and checkout. */
export async function liveSchedule(settings: OrderingSettings, excludeNonce?: string, at: Date = new Date()) {
  const taken = await takenSlotTimes(scheduleRange(settings, at), excludeNonce);
  return buildSchedule(settings, at, taken);
}

/**
 * After a scheduled order is paid: was its slot already full of earlier payments? Ranked by
 * payment time so two payments landing together can't both claim the last place.
 */
export async function isOverSlotCapacity(order: { id: string; scheduledFor: string }, settings: OrderingSettings) {
  const start = Date.parse(order.scheduledFor);
  const { data, error } = await supabase
    .from("orders")
    .select("id, payment_confirmed_at")
    .eq("collection_type", "scheduled")
    .eq("payment_status", "paid")
    .neq("order_status", "cancelled")
    .gte("scheduled_for", new Date(start).toISOString())
    .lt("scheduled_for", new Date(start + settings.slotMinutes * 60_000).toISOString());
  if (error) throw error;

  const ranked = [...(data as { id: string; payment_confirmed_at: string | null }[])].sort(
    (a, b) =>
      Date.parse(a.payment_confirmed_at ?? "") - Date.parse(b.payment_confirmed_at ?? "") || a.id.localeCompare(b.id),
  );
  const position = ranked.findIndex((row) => row.id === order.id);
  return position === -1 ? ranked.length >= settings.maxOrdersPerSlot : position >= settings.maxOrdersPerSlot;
}
