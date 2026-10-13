"use client";

import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { pauseOrderingAction, resumeOrderingAction } from "@/app/admin/(protected)/orders/actions";
import { buttonClasses } from "@/components/Button";
import { formatClock } from "@/lib/ordering/hours";
import { PAUSE_OPTIONS } from "@/lib/ordering/limits";

const subscribeSecond = (listener: () => void) => {
  const id = window.setInterval(listener, 1000);
  return () => window.clearInterval(id);
};
const getSecond = () => Math.floor(Date.now() / 1000) * 1000;

function countdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Pause ASAP orders for a few minutes when the kitchen is swamped. The end time is stored, not a
 * timer: the storefront and checkout compare it with the clock, so ordering resumes by itself.
 */
export function PauseControls({
  pausedUntil,
  acceptingOrders,
  pauseAllowsScheduled,
}: {
  pausedUntil: string | null;
  acceptingOrders: boolean;
  pauseAllowsScheduled: boolean;
}) {
  const now = useSyncExternalStore(subscribeSecond, getSecond, () => null);
  const [optimistic, setOptimistic] = useOptimistic(pausedUntil);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const end = optimistic ? Date.parse(optimistic) : null;
  const paused = end !== null && now !== null && end > now;

  const pause = (minutes: number) => {
    setError(null);
    startTransition(async () => {
      setOptimistic(new Date(Date.now() + minutes * 60_000).toISOString());
      const result = await pauseOrderingAction(minutes);
      if (!result.ok) setError(result.message);
    });
  };
  const resume = () => {
    setError(null);
    startTransition(async () => {
      setOptimistic(null);
      const result = await resumeOrderingAction();
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div
      className={`rounded-sm border px-4 py-3 ${paused ? "border-sorrel border-l-4 bg-paper" : "border-hairline bg-paper"}`}
      aria-busy={pending}
    >
      {paused && end !== null && now !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="status">
            <p className="font-semibold text-sorrel">
              Paused until {formatClock(end)}
              <span className="ml-2 font-display text-[24px] tabular-nums text-pimento">{countdown(end - now)}</span>
            </p>
            <p className="text-[13px] text-muted">
              {pauseAllowsScheduled
                ? "ASAP orders are off. Customers can still book later times."
                : "All online orders are off until then."}
            </p>
          </div>
          <button type="button" onClick={resume} disabled={pending} className={buttonClasses("primary", "md", "min-h-14")}>
            Resume now
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p id="pause-label" className="mr-1 font-semibold">
            Pause
            <span className="block text-[13px] font-normal text-muted">Busy? Stop ASAP orders for a bit.</span>
          </p>
          <div role="group" aria-labelledby="pause-label" className="flex gap-2">
            {PAUSE_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => pause(minutes)}
                disabled={pending || !acceptingOrders || now === null}
                className={buttonClasses("secondary", "md", "min-h-14 px-4")}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[15px] font-semibold text-sorrel">
          {error}
        </p>
      )}
    </div>
  );
}
