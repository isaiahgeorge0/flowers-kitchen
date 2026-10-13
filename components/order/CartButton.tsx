"use client";

import { cart, cartTotals, useCart } from "@/lib/ordering/cart-store";

/** Header basket button; hidden until there's something in the basket. Compact on phones. */
export function CartButton({ compact = false }: { compact?: boolean }) {
  const { count } = cartTotals(useCart());
  if (count === 0) return null;

  const badge = (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-sorrel px-1.5 py-0.5 text-[13px] font-semibold leading-none tracking-normal text-cream tabular-nums">
      {count}
      <span className="sr-only"> {count === 1 ? "box" : "boxes"}</span>
    </span>
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={cart.openDrawer}
        aria-haspopup="dialog"
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center text-pimento"
      >
        <span className="sr-only">Basket, </span>
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
        <span className="absolute right-0 top-0.5">{badge}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cart.openDrawer}
      aria-haspopup="dialog"
      className="inline-flex min-h-11 items-center gap-2 px-2 text-[15px] font-semibold uppercase tracking-[0.08em] text-pimento"
    >
      Basket
      {badge}
    </button>
  );
}
