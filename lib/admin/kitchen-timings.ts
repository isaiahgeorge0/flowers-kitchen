import { UPCOMING_WINDOW_MINUTES } from "@/lib/ordering/limits";
import type { OrderDetail } from "@/lib/ordering/orders";

const MINUTE = 60_000;
const UPCOMING_MS = UPCOMING_WINDOW_MINUTES * MINUTE;

/** Minutes in a column before its timer turns amber ("Slow") and red ("Overdue"). */
export const TIMER_THRESHOLDS = {
  confirmed: { slow: 5, overdue: 10 }, // nobody has picked it up
  preparing: { slow: 15, overdue: 25 },
  ready_for_collection: { slow: 10, overdue: 20 }, // customer hasn't collected
} as const;

/** A scheduled order still in New gets "Start now" this long before it's due. */
export const SCHEDULED_START_LEAD_MINUTES = 15;

export type CardState = "normal" | "slow" | "overdue" | "start" | "late";

export const CARD_STATE_LABELS: Record<Exclude<CardState, "normal" | "late">, string> = {
  slow: "Slow",
  overdue: "Overdue",
  start: "Start now",
};

function thresholdState(status: OrderDetail["orderStatus"], minutesInColumn: number): CardState {
  const row = TIMER_THRESHOLDS[status as keyof typeof TIMER_THRESHOLDS];
  if (!row) return "normal";
  if (minutesInColumn >= row.overdue) return "overdue";
  if (minutesInColumn >= row.slow) return "slow";
  return "normal";
}

export type TimingFields = Pick<
  OrderDetail,
  | "orderStatus"
  | "createdAt"
  | "paymentConfirmedAt"
  | "confirmedAt"
  | "preparedAt"
  | "readyAt"
  | "completedAt"
  | "cancelledAt"
  | "scheduledFor"
  | "statusChangedAt"
>;

const at = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);

/**
 * When the order joined the board: when it was paid, or for a scheduled order when it joined New,
 * 30 minutes before collection. A scheduled order started early joined when it was started.
 */
export function joinedBoardAt(order: TimingFields) {
  const paid = Date.parse(order.confirmedAt ?? order.paymentConfirmedAt ?? order.createdAt);
  if (!order.scheduledFor) return paid;
  const joinedNew = Math.max(paid, Date.parse(order.scheduledFor) - UPCOMING_MS);
  const started = at(order.preparedAt);
  return started === null ? joinedNew : Math.min(joinedNew, started);
}

/** When the ticket entered its current column. A scheduled order in New counts from when it joined New. */
export function columnEnteredAt(order: TimingFields) {
  const changed = at(order.statusChangedAt) ?? joinedBoardAt(order);
  if (order.orderStatus === "confirmed" && order.scheduledFor) {
    return Math.max(changed, Date.parse(order.scheduledFor) - UPCOMING_MS);
  }
  return changed;
}

/**
 * What a card in the kitchen needs flagging for. Scheduled orders skip New's thresholds: nothing
 * until SCHEDULED_START_LEAD_MINUTES before due, then "Start now"; once past due, "Late" in any
 * column. Preparing and Ready otherwise use their normal thresholds.
 */
export function cardState(order: TimingFields, now: number): { state: CardState; lateMinutes: number } {
  const active = ["confirmed", "preparing", "ready_for_collection"].includes(order.orderStatus);
  if (!active) return { state: "normal", lateMinutes: 0 };
  if (order.scheduledFor) {
    const due = Date.parse(order.scheduledFor);
    const late = wholeMinutes(now - due);
    if (late >= 1) return { state: "late", lateMinutes: late };
    if (order.orderStatus === "confirmed") {
      return { state: due - now <= SCHEDULED_START_LEAD_MINUTES * MINUTE ? "start" : "normal", lateMinutes: 0 };
    }
  }
  return { state: thresholdState(order.orderStatus, wholeMinutes(now - columnEnteredAt(order))), lateMinutes: 0 };
}

/** When the order left the board, if it has. */
export function finishedAt(order: TimingFields) {
  if (order.orderStatus === "completed") return at(order.completedAt);
  if (order.orderStatus === "cancelled") return at(order.cancelledAt);
  return null;
}

export const wholeMinutes = (ms: number) => Math.max(0, Math.floor(ms / MINUTE));

export type OrderDurations = { waiting: number; cooking: number; collectionWait: number; total: number };

/**
 * Milliseconds per stage for a collected order. Each stamp is the last time the ticket moved
 * forward into that column, so a ticket sent back is timed from its final pass.
 */
export function orderDurations(order: TimingFields): OrderDurations | null {
  if (order.orderStatus !== "completed") return null;
  const prepared = at(order.preparedAt);
  const ready = at(order.readyAt);
  const completed = at(order.completedAt);
  if (prepared === null || ready === null || completed === null) return null;
  const joined = joinedBoardAt(order);
  return {
    waiting: Math.max(0, prepared - joined),
    cooking: Math.max(0, ready - prepared),
    collectionWait: Math.max(0, completed - ready),
    total: Math.max(0, completed - joined),
  };
}

export const DURATION_LABELS: Record<keyof OrderDurations, string> = {
  waiting: "Waiting",
  cooking: "Cooking",
  collectionWait: "Collection wait",
  total: "Total",
};

/** "Just now", "18 min", "1 h 5 min". */
export function formatMinutes(minutes: number) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

/** A live timer: "0 min", "18 min", "1 h 5 min". */
export const formatTimer = (minutes: number) => (minutes < 1 ? "0 min" : formatMinutes(minutes));

/** Like formatMinutes, for a duration: "0 min" rather than "Just now". */
export const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / MINUTE);
  return minutes < 1 ? "0 min" : formatMinutes(minutes);
};
