"use client";

import { cart } from "@/lib/ordering/cart-store";
import { basketSidesNote } from "@/lib/ordering/sides";
import type { BasketFlag, CartLine } from "@/lib/ordering/types";

/** Choices, any sides that are out today, and a flag when the line can't be ordered as it is. */
export function BasketLineDetails({
  line,
  missingSides = [],
  flag,
}: {
  line: CartLine;
  missingSides?: string[];
  flag: BasketFlag | null;
}) {
  const details = [line.optionLabels.join(", "), basketSidesNote(missingSides)].filter(Boolean).join(" ");
  return (
    <>
      {details && <p className="text-[15px] text-muted">{details}</p>}
      {flag && (
        <div role="note" className="mt-3 rounded-input border border-sorrel bg-sorrel/[0.05] px-4 py-3 text-[15px]" data-basket-flag>
          <p className="font-semibold text-sorrel">{flag.note}</p>
          {flag.swap ? (
            <button
              type="button"
              onClick={() => flag.swap && cart.swapOption(line.key, flag.swap)}
              className="-ml-1 mt-1 inline-flex min-h-11 items-center rounded-pill px-1 font-semibold text-pimento underline decoration-sorrel underline-offset-4"
            >
              Switch to {flag.swap.toName.charAt(0).toLowerCase() + flag.swap.toName.slice(1)}
              <span className="sr-only"> for {line.name}</span>
            </button>
          ) : (
            <p className="mt-0.5 text-muted">Please remove it from your basket.</p>
          )}
        </div>
      )}
    </>
  );
}
