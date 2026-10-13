"use client";

import { useMemo, useSyncExternalStore } from "react";
import { orderingStatus, type OrderingStatus } from "./hours";
import { canSchedule } from "./schedule";
import type { OrderingSettings } from "./types";

const TICK_MS = 15_000;

function subscribe(listener: () => void) {
  const id = window.setInterval(listener, TICK_MS);
  return () => window.clearInterval(id);
}

const getTick = () => Math.floor(Date.now() / TICK_MS);

export type OrderingState = {
  /** Whether ASAP orders can be placed. */
  status: OrderingStatus;
  /** Whether a later collection time can be booked (capacity aside; the server checks that). */
  canSchedule: boolean;
  /** Either way, the customer can put boxes in the basket and check out. */
  canOrder: boolean;
};

/**
 * Open, paused or closed right now, re-checked every 15 seconds in the browser, so a pause ends
 * by itself. Null while the page hydrates, so cached HTML never shows a stale state. Checkout
 * re-checks everything on the server.
 */
export function useOrderingStatus(settings: OrderingSettings): OrderingState | null {
  const tick = useSyncExternalStore(subscribe, getTick, () => null);
  return useMemo(() => {
    if (tick === null) return null;
    const at = new Date(tick * TICK_MS);
    const status = orderingStatus(settings, at);
    const scheduling = canSchedule(settings, at);
    return { status, canSchedule: scheduling, canOrder: status.open || scheduling };
  }, [settings, tick]);
}
