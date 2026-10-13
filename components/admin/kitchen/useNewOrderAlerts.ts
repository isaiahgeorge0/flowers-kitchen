"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { playNewOrderAlert, readSoundEnabled, writeSoundEnabled } from "@/lib/admin/kitchen-alerts";

// Ported from the template's use-admin-new-order-sound-alerts.ts: new orders are found by
// comparing the ids in each server refresh with the ones already seen in this tab.
const HIGHLIGHT_MS = 50_000;

const soundListeners = new Set<() => void>();
function subscribeSound(listener: () => void) {
  soundListeners.add(listener);
  return () => soundListeners.delete(listener);
}
function setSound(enabled: boolean) {
  writeSoundEnabled(enabled);
  soundListeners.forEach((listener) => listener());
}

export function useNewOrderAlerts(newOrderIds: string[]) {
  const soundOn = useSyncExternalStore(subscribeSound, readSoundEnabled, () => false);
  const [highlighted, setHighlighted] = useState<ReadonlySet<string>>(() => new Set());
  const [soundError, setSoundError] = useState<string | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const key = [...newOrderIds].sort().join(",");

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (seenRef.current === null) {
      seenRef.current = new Set(ids);
      return;
    }
    const fresh = ids.filter((id) => !seenRef.current!.has(id));
    ids.forEach((id) => seenRef.current!.add(id));
    if (fresh.length === 0) return;

    const frame = requestAnimationFrame(() => {
      setHighlighted((current) => new Set([...current, ...fresh]));
      if (readSoundEnabled()) void playNewOrderAlert();
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        setHighlighted((current) => new Set([...current].filter((id) => !fresh.includes(id))));
      }, HIGHLIGHT_MS);
      timersRef.current.add(timer);
    });
    return () => cancelAnimationFrame(frame);
  }, [key]);

  const toggleSound = useCallback(async () => {
    setSoundError(null);
    if (readSoundEnabled()) {
      setSound(false);
      return;
    }
    // The tap itself unlocks audio; the test beep confirms it works.
    if (await playNewOrderAlert()) setSound(true);
    else setSoundError("Your browser blocked sound. Allow sound for this site, then try again.");
  }, []);

  return { soundOn, toggleSound, soundError, highlighted };
}
