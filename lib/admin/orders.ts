import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { zonedDayStart } from "@/lib/ordering/hours";
import { toPence } from "@/lib/ordering/money";
import { ADMIN_ORDER_SELECT, mapOrder, type OrderDetail, type OrderStatus } from "@/lib/ordering/orders";
import { dayName, zonedIsoDate } from "@/lib/ordering/schedule";

const TIME_ZONE = "Europe/London";
export const ACTIVE_STATUSES: OrderStatus[] = ["confirmed", "preparing", "ready_for_collection"];

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Kitchen board: paid orders in the kitchen, plus today's collected and cancelled ones. */
export async function fetchKitchenOrders(supabase: SupabaseClient) {
  const todayStart = zonedDayStart(new Date(), TIME_ZONE).toISOString();
  const [active, finished] = await Promise.all([
    supabase
      .from("orders")
      .select(ADMIN_ORDER_SELECT)
      .in("order_status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true })
      .limit(400),
    supabase
      .from("orders")
      .select(ADMIN_ORDER_SELECT)
      .in("order_status", ["completed", "cancelled"])
      .not("payment_confirmed_at", "is", null)
      .or(`completed_at.gte.${todayStart},cancelled_at.gte.${todayStart}`)
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);
  const fetchedAt = Date.now();
  if (active.error || finished.error) return { orders: [] as OrderDetail[], failed: true, fetchedAt };
  const rows = [...active.data, ...finished.data] as unknown as Parameters<typeof mapOrder>[0][];
  return { orders: rows.map(mapOrder), failed: false, fetchedAt };
}

export type ScheduledDay = { date: string; label: string; orders: number };

/**
 * Dashboard numbers: today's paid orders and takings, the web/QR split, what's in the kitchen,
 * and scheduled collections for today and the next 7 days.
 */
export async function fetchTodayOrderStats(supabase: SupabaseClient) {
  const now = new Date();
  const todayStart = zonedDayStart(now, TIME_ZONE);
  const weekEnd = zonedDayStart(new Date(todayStart.getTime() + 8.5 * 86_400_000), TIME_ZONE);
  const [today, inKitchen, scheduled] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount, payment_status, source")
      .not("payment_confirmed_at", "is", null)
      .gte("created_at", todayStart.toISOString()),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("order_status", ACTIVE_STATUSES),
    supabase
      .from("orders")
      .select("scheduled_for, order_status")
      .eq("collection_type", "scheduled")
      .not("payment_confirmed_at", "is", null)
      .neq("order_status", "cancelled")
      .gte("scheduled_for", now.toISOString())
      .lt("scheduled_for", weekEnd.toISOString())
      .limit(2000),
  ]);
  if (today.error || inKitchen.error || scheduled.error) return null;

  const paid = today.data.filter((row) => row.payment_status === "paid");
  const todayIso = zonedIsoDate(now.getTime(), TIME_ZONE);
  const byDay = new Map<string, number>();
  let upcomingToday = 0;
  for (const row of scheduled.data) {
    const day = zonedIsoDate(row.scheduled_for, TIME_ZONE);
    if (day === todayIso) {
      if (row.order_status === "confirmed") upcomingToday += 1;
      continue;
    }
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const nextDays: ScheduledDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${todayIso}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index + 1);
    const iso = date.toISOString().slice(0, 10);
    return { date: iso, label: dayName(iso), orders: byDay.get(iso) ?? 0 };
  });

  return {
    orders: today.data.length,
    revenuePence: paid.reduce((sum, row) => sum + toPence(row.total_amount), 0),
    pending: inKitchen.count ?? 0,
    web: today.data.filter((row) => row.source !== "qr").length,
    qr: today.data.filter((row) => row.source === "qr").length,
    upcomingToday,
    nextDays,
  };
}
