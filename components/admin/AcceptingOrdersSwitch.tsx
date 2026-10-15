"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { setAcceptingOrdersAction } from "@/app/admin/(protected)/settings/actions";
import { buttonClasses } from "@/components/Button";
import { Sheet, SheetClose } from "@/components/order/Sheet";

/** The on/off switch for online orders. `large` on Settings, compact on the kitchen board. */
export function AcceptingOrdersSwitch({ enabled, large = false }: { enabled: boolean; large?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();

  const apply = (next: boolean) => {
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setAcceptingOrdersAction(next);
      if (!result.ok) setError(result.message);
    });
  };

  const toggle = () => (optimistic ? setConfirming(true) : apply(true));

  const stop = () => {
    setConfirming(false);
    apply(false);
  };

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-busy={pending}
        onClick={toggle}
        className={`flex w-full items-center gap-4 rounded-card border text-left transition-colors duration-300 ease-out ${
          optimistic ? "border-mountain bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)]" : "border-sorrel bg-paper text-pimento"
        } ${large ? "min-h-20 px-6 py-4" : "min-h-14 px-4 py-2"}`}
      >
        <span
          aria-hidden
          className={`relative inline-flex shrink-0 items-center rounded-pill border-2 transition-colors duration-300 ease-out ${
            optimistic ? "border-cream bg-cream/20" : "border-sorrel bg-cream"
          } ${large ? "h-9 w-16" : "h-7 w-12"}`}
        >
          <span
            className={`absolute rounded-pill transition-transform duration-300 ease-out motion-reduce:transition-none ${
              optimistic ? "bg-cream" : "bg-sorrel"
            } ${large ? "left-1 size-6" : "left-0.5 size-5"} ${
              optimistic ? (large ? "translate-x-7" : "translate-x-5") : "translate-x-0"
            }`}
          />
        </span>
        <span className="min-w-0">
          <span className={`block font-semibold ${large ? "text-[20px]" : "text-[16px]"}`}>
            {optimistic ? "Taking online orders" : "Online orders are off"}
          </span>
          <span className={`block ${large ? "text-[15px]" : "text-[13px]"} ${optimistic ? "text-mountain-muted" : "text-muted"}`}>
            {optimistic ? "Within opening hours. Tap to stop." : "Customers can browse but not order. Tap to start."}
          </span>
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[15px] font-semibold text-sorrel">
          {error}
        </p>
      )}

      <Sheet open={confirming} onClose={() => setConfirming(false)} labelledBy={titleId}>
        <div className="overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-display text-[28px] font-semibold leading-tight">
              Stop taking online orders?
            </h2>
            <SheetClose onClick={() => setConfirming(false)} />
          </div>
          <p className="mt-3 text-[17px]">
            Customers won&rsquo;t be able to order until you turn this back on. Scheduled orders already placed are
            unaffected.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setConfirming(false)} className={buttonClasses("secondary", "md", "min-h-14")}>
              Keep taking orders
            </button>
            <button type="button" onClick={stop} className={buttonClasses("primary", "md", "min-h-14")}>
              Stop orders
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
