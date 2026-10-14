"use client";

import Link from "next/link";
import { useId } from "react";
import { buttonClasses } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { h2, h3 } from "@/lib/typography";
import { ServiceNote } from "@/components/ServiceNote";
import { cart, cartTotals, useCart, useCartDrawerOpen } from "@/lib/ordering/cart-store";
import { MAX_LINE_QUANTITY } from "@/lib/ordering/limits";
import { formatPence } from "@/lib/ordering/money";
import { QuantityStepper } from "./QuantityStepper";
import { Sheet, SheetClose } from "./Sheet";

// Ported from the template's storefront/cart/cart-drawer.tsx, without delivery or fulfilment
// choices: collection only.
export function CartDrawer() {
  const open = useCartDrawerOpen();
  const lines = useCart();
  const titleId = useId();
  const { count, totalPence } = cartTotals(lines);

  return (
    <Sheet open={open} onClose={cart.closeDrawer} labelledBy={titleId} variant="drawer">
      <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 pt-6 pb-5">
        <div>
          <Eyebrow>Your order</Eyebrow>
          <h2 id={titleId} className={`mt-3 ${h2}`}>
            Basket
          </h2>
        </div>
        <SheetClose onClick={cart.closeDrawer} />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6">
        {lines.length === 0 ? (
          <div className="py-16 text-center">
            <p className={h3}>Your basket is empty</p>
            <p className="mt-2 text-muted">Choose a box to get started.</p>
            <Link href="/order" onClick={cart.closeDrawer} className={buttonClasses("secondary", "md", "mt-6")}>
              See the boxes
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {lines.map((line) => (
              <li key={line.key} className="py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{line.name}</p>
                    {line.optionLabels.length > 0 && <p className="text-[15px] text-muted">{line.optionLabels.join(", ")}</p>}
                  </div>
                  <p className="font-semibold tabular-nums">{formatPence(line.unitPence * line.quantity)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <QuantityStepper
                    value={line.quantity}
                    min={0}
                    max={MAX_LINE_QUANTITY}
                    onChange={(quantity) => cart.setQuantity(line.key, quantity)}
                    label={`Number of ${line.name} boxes`}
                  />
                  <button
                    type="button"
                    onClick={() => cart.remove(line.key)}
                    className="-mr-2 inline-flex min-h-11 items-center rounded-pill px-3 text-[15px] text-muted underline decoration-hairline underline-offset-4 transition-colors duration-300 ease-out hover:text-pimento hover:decoration-pimento"
                  >
                    Remove<span className="sr-only"> {line.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <div className="border-t border-hairline px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-semibold">
              Total <span className="font-normal text-muted">· {count} {count === 1 ? "box" : "boxes"}</span>
            </p>
            <p className="font-display text-[28px] font-semibold leading-none text-sorrel tabular-nums">{formatPence(totalPence)}</p>
          </div>
          <p className="mt-1 text-[13px] text-muted">Prices are checked again when you pay.</p>
          <Link href="/order/checkout" onClick={cart.closeDrawer} className={buttonClasses("primary", "lg", "mt-5 w-full")}>
            Go to checkout
          </Link>
          <ServiceNote className="mt-4 text-center text-muted" />
        </div>
      )}
    </Sheet>
  );
}
