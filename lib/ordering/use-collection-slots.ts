"use client";

import { useEffect, useState } from "react";
import { checkoutNonce } from "./cart-store";
import type { ScheduleDay } from "./schedule";

export type SlotsState = { status: "loading" } | { status: "error" } | { status: "ready"; days: ScheduleDay[] };

/** Live collection slots for the time picker; reloads when `reloadKey` changes. */
export function useCollectionSlots(enabled: boolean, reloadKey: string): SlotsState {
  const [result, setResult] = useState<{ key: string; days: ScheduleDay[] | null } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/api/order-slots?nonce=${encodeURIComponent(checkoutNonce())}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<{ ok: boolean; days?: ScheduleDay[] }>)
      .then((body) => setResult({ key: reloadKey, days: body.ok && body.days ? body.days : null }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key: reloadKey, days: null });
      });
    return () => controller.abort();
  }, [enabled, reloadKey]);

  if (!result || result.key !== reloadKey) return { status: "loading" };
  return result.days ? { status: "ready", days: result.days } : { status: "error" };
}

/** The chosen slot if it's still offered and not full, else "". */
export function validSlot(slots: SlotsState, slot: string) {
  if (slots.status !== "ready" || !slot) return "";
  const match = slots.days.flatMap((day) => day.slots).find((candidate) => candidate.start === slot);
  return match && !match.full ? slot : "";
}
