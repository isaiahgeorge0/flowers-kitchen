import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DURATION_LABELS, orderDurations, type OrderDurations } from "@/lib/admin/kitchen-timings";
import { cleanLeadSearch } from "@/lib/admin/leads";
import { zonedDayStart } from "@/lib/ordering/hours";
import { toPence } from "@/lib/ordering/money";
import { mapOrder, ORDER_SELECT, type OrderDetail } from "@/lib/ordering/orders";
import { formatCollectionLong, zonedIsoDate } from "@/lib/ordering/schedule";

const TIME_ZONE = "Europe/London";
export const HISTORY_LIST_LIMIT = 200;
const TOTALS_LIMIT = 10_000;
const MAX_RANGE_DAYS = 366;

export const HISTORY_STATUSES = ["all", "in_kitchen", "completed", "cancelled", "refunded"] as const;
export type HistoryStatus = (typeof HISTORY_STATUSES)[number];
export const HISTORY_STATUS_LABELS: Record<HistoryStatus, string> = {
  all: "All",
  in_kitchen: "In the kitchen",
  completed: "Collected",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export type HistoryFilters = { from: string; to: string; q: string; status: HistoryStatus };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const validDate = (value: unknown): value is string =>
  typeof value === "string" && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));

/** From the URL; defaults to the last 7 days. Swaps a reversed range and caps it at a year. */
export function parseHistoryFilters(sp: Record<string, string | string[] | undefined>): HistoryFilters {
  const today = zonedIsoDate(Date.now(), TIME_ZONE);
  let from = validDate(sp.from) ? sp.from : shiftDate(today, -6);
  let to = validDate(sp.to) ? sp.to : today;
  if (from > to) [from, to] = [to, from];
  if (shiftDate(from, MAX_RANGE_DAYS) < to) from = shiftDate(to, -MAX_RANGE_DAYS);
  const status = HISTORY_STATUSES.includes(sp.status as HistoryStatus) ? (sp.status as HistoryStatus) : "all";
  return { from, to, q: cleanLeadSearch(typeof sp.q === "string" ? sp.q : undefined), status };
}

export function historyQuery(filters: HistoryFilters) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  return params.toString();
}

const dayStart = (isoDate: string) => zonedDayStart(new Date(`${isoDate}T12:00:00Z`), TIME_ZONE).toISOString();

/** Paid orders placed in the range, newest first. Unpaid checkouts never reached the kitchen, so they're left out. */
function filtered(client: SupabaseClient, columns: string, filters: HistoryFilters, limit: number) {
  let query = client
    .from("orders")
    .select(columns)
    .not("payment_confirmed_at", "is", null)
    .gte("created_at", dayStart(filters.from))
    .lt("created_at", dayStart(shiftDate(filters.to, 1)));

  if (filters.status === "in_kitchen") query = query.in("order_status", ["confirmed", "preparing", "ready_for_collection"]);
  if (filters.status === "completed") query = query.eq("order_status", "completed");
  if (filters.status === "cancelled") query = query.eq("order_status", "cancelled");
  if (filters.status === "refunded") query = query.neq("refund_status", "none");

  if (filters.q) {
    const number = filters.q.replace(/^#/, "");
    query = /^\d{1,9}$/.test(number)
      ? query.or(`order_number.eq.${number},customer_phone.ilike."%${number}%"`)
      : query.or(`customer_name.ilike."%${filters.q}%",customer_phone.ilike."%${filters.q}%"`);
  }
  return query.order("created_at", { ascending: false }).limit(limit);
}

export type HistoryTotals = { orders: number; paidPence: number; refundsPence: number };
type TotalsRow = { total_amount: number | string; refunded_total: number | string | null };

export async function fetchOrderHistory(client: SupabaseClient, filters: HistoryFilters, limit = HISTORY_LIST_LIMIT) {
  const [list, totals] = await Promise.all([
    filtered(client, ORDER_SELECT, filters, limit),
    filtered(client, "total_amount, refunded_total", filters, TOTALS_LIMIT),
  ]);
  if (list.error || totals.error) return { orders: [] as OrderDetail[], totals: null, failed: true };

  const rows = (totals.data ?? []) as unknown as TotalsRow[];
  return {
    orders: ((list.data ?? []) as unknown as Parameters<typeof mapOrder>[0][]).map(mapOrder),
    totals: {
      orders: rows.length,
      paidPence: rows.reduce((sum, row) => sum + toPence(row.total_amount), 0),
      refundsPence: rows.reduce((sum, row) => sum + toPence(row.refunded_total ?? 0), 0),
    } satisfies HistoryTotals,
    failed: false,
  };
}

const DURATION_KEYS = Object.keys(DURATION_LABELS) as (keyof OrderDurations)[];

export type TodayAverages = { orders: number; averages: OrderDurations };

type TimingRow = {
  created_at: string;
  payment_confirmed_at: string | null;
  confirmed_at: string | null;
  prepared_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  scheduled_for: string | null;
};

/** Average stage times for orders collected today. Null if none yet; undefined if the query failed. */
export async function fetchTodayAverages(client: SupabaseClient): Promise<TodayAverages | null | undefined> {
  const { data, error } = await client
    .from("orders")
    .select("created_at, payment_confirmed_at, confirmed_at, prepared_at, ready_at, completed_at, scheduled_for")
    .eq("order_status", "completed")
    .gte("completed_at", zonedDayStart(new Date(), TIME_ZONE).toISOString())
    .limit(TOTALS_LIMIT);
  if (error) return undefined;

  const durations = ((data ?? []) as TimingRow[])
    .map((row) =>
      orderDurations({
        orderStatus: "completed",
        createdAt: row.created_at,
        paymentConfirmedAt: row.payment_confirmed_at,
        confirmedAt: row.confirmed_at,
        preparedAt: row.prepared_at,
        readyAt: row.ready_at,
        completedAt: row.completed_at,
        cancelledAt: null,
        scheduledFor: row.scheduled_for,
      }),
    )
    .filter((d): d is OrderDurations => d !== null);
  if (durations.length === 0) return null;

  const averages = Object.fromEntries(
    DURATION_KEYS.map((key) => [key, durations.reduce((sum, d) => sum + d[key], 0) / durations.length]),
  ) as OrderDurations;
  return { orders: durations.length, averages };
}

export const ORDER_STATUS_LABELS: Record<OrderDetail["orderStatus"], string> = {
  pending: "Awaiting payment",
  confirmed: "New",
  preparing: "Preparing",
  ready_for_collection: "Ready",
  completed: "Collected",
  cancelled: "Cancelled",
};

export function formatPlaced(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function collectionLabel(order: OrderDetail) {
  return order.scheduledFor ? formatCollectionLong(order.scheduledFor) : "ASAP";
}

/** One CSV cell: quoted when needed, and never starting like a spreadsheet formula. */
function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function ordersCsv(orders: OrderDetail[]) {
  const header = [
    "Order number",
    "Placed",
    "Collection",
    "Collection time",
    "Customer",
    "Phone",
    "Email",
    "Items",
    "Total (GBP)",
    "Refunded (GBP)",
    "Payment",
    "Status",
    "Source",
    "Cancel reason",
    ...DURATION_KEYS.map((key) => `${DURATION_LABELS[key]} (min)`),
  ];
  const pounds = (pence: number) => (pence / 100).toFixed(2);
  const lines = orders.map((order) => {
    const durations = orderDurations(order);
    return [
      order.orderNumber,
      formatPlaced(order.createdAt),
      order.scheduledFor ? "Scheduled" : "ASAP",
      order.scheduledFor ? formatCollectionLong(order.scheduledFor) : "",
      order.customerName,
      order.customerPhone,
      order.customerEmail,
      order.items
        .map((item) => `${item.quantity} x ${item.name}${item.options.length ? ` (${item.options.join(", ")})` : ""}`)
        .join("; "),
      pounds(order.totalPence),
      pounds(order.refundedPence),
      order.paymentStatus,
      ORDER_STATUS_LABELS[order.orderStatus],
      order.source === "qr" ? "QR" : "Web",
      order.cancelReason ?? "",
      ...DURATION_KEYS.map((key) => (durations ? Math.round(durations[key] / 60_000) : "")),
    ]
      .map(csvCell)
      .join(",");
  });
  // Byte order mark so Excel reads the file as UTF-8 (£, accents).
  return `\uFEFF${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
}
