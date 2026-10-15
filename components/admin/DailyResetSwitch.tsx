"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setDailyResetAction } from "@/app/admin/(protected)/settings/actions";

/** Settings: put shared items and sold-out boxes back on sale at 4am each day. */
export function DailyResetSwitch({ enabled, canChange }: { enabled: boolean; canChange: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    const next = !optimistic;
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setDailyResetAction(next);
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-busy={pending}
        disabled={!canChange}
        onClick={toggle}
        className="flex min-h-16 w-full items-center gap-4 rounded-card border border-hairline bg-paper px-5 py-3 text-left transition-colors duration-300 ease-out enabled:hover:border-pimento disabled:cursor-not-allowed"
      >
        <span
          aria-hidden
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill border-2 transition-colors duration-300 ease-out ${
            optimistic ? "border-mountain bg-mountain" : "border-hairline bg-cream"
          }`}
        >
          <span
            className={`absolute left-0.5 size-5 rounded-pill transition-transform duration-300 ease-out motion-reduce:transition-none ${
              optimistic ? "translate-x-5 bg-cream" : "translate-x-0 bg-muted"
            }`}
          />
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold">Reset sold-out items each morning</span>
          <span className="block text-[15px] text-muted">
            {optimistic
              ? "At 4am, every shared ingredient goes back on and every box marked sold out goes back on sale."
              : "Off. Anything switched off stays off until someone switches it back on."}
          </span>
        </span>
      </button>
      {!canChange && <p className="mt-2 text-[15px] text-muted">Ask the owner to change this.</p>}
      {error && (
        <p role="alert" className="mt-2 text-[15px] font-semibold text-sorrel">
          {error}
        </p>
      )}
    </div>
  );
}
