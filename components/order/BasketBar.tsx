"use client";

import { buttonClasses } from "@/components/Button";
import { cart, cartTotals, useCart } from "@/lib/ordering/cart-store";
import { formatPence } from "@/lib/ordering/money";

/** Sticky "View basket" bar on the order page once something is in the basket. */
export function BasketBar() {
  const lines = useCart();
  const { count, totalPence } = cartTotals(lines);
  if (count === 0) return null;

  return (
    <>
      <div aria-hidden className="h-24" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-cream/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 motion-safe:animate-fade-rise">
        <div className="mx-auto max-w-content md:px-2">
          <button type="button" onClick={cart.openDrawer} className={buttonClasses("primary", "md", "w-full justify-between gap-4")}>
            <span>View basket</span>
            <span className="tabular-nums">
              {count} {count === 1 ? "box" : "boxes"} · {formatPence(totalPence)}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
