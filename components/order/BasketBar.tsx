"use client";

import { ShoppingBag } from "lucide-react";
import { buttonClasses } from "@/components/Button";
import { cart, cartTotals, useCart } from "@/lib/ordering/cart-store";
import { formatPence } from "@/lib/ordering/money";

/** Floating "View basket" bar on the order page once something is in the basket. */
export function BasketBar() {
  const lines = useCart();
  const { count, totalPence } = cartTotals(lines);
  if (count === 0) return null;

  return (
    <>
      <div aria-hidden className="h-24" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] motion-safe:animate-fade-rise">
        <div className="pointer-events-auto mx-auto max-w-md rounded-pill border border-hairline bg-paper-glass p-1.5 shadow-lift backdrop-blur-md">
          <button type="button" onClick={cart.openDrawer} className={buttonClasses("primary", "lg", "w-full justify-between gap-4 px-6")}>
            <span className="flex items-center gap-2.5">
              <ShoppingBag aria-hidden strokeWidth={1.5} className="size-5" />
              View basket
            </span>
            <span className="tabular-nums">
              {count} {count === 1 ? "box" : "boxes"} · {formatPence(totalPence)}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
