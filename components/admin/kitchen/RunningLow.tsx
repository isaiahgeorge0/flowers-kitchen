"use client";

import { useId, useState } from "react";
import { SharedIngredients } from "@/components/admin/SharedIngredients";
import { buttonClasses } from "@/components/Button";
import { Sheet, SheetClose } from "@/components/order/Sheet";
import type { SharedPanelData } from "@/lib/admin/shared-items";

/** "Running low?" opens the shared ingredient switches without leaving the board. */
export function RunningLow({ data, compact = false }: { data: SharedPanelData; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const out = data.items.filter((item) => !item.available).length;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={buttonClasses("secondary", "md", compact ? "shrink-0 gap-2 max-sm:px-3" : "min-h-14 gap-2")}
        data-running-low
      >
        Running low?
        {out > 0 && (
          <span className="inline-flex min-h-6 items-center rounded-pill bg-sorrel px-2 text-[13px] font-semibold text-cream">
            {out}
            <span className="sr-only"> out</span>
          </span>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy={titleId} variant="drawer">
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 pt-6 pb-5">
          <div>
            <h2 id={titleId} className="font-display text-[28px] font-semibold leading-tight">
              Shared ingredients
            </h2>
            <p className="mt-1 text-[15px] text-muted">One switch for every box.</p>
          </div>
          <SheetClose onClick={() => setOpen(false)} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          <SharedIngredients data={data} headingLevel={3} stacked />
        </div>
      </Sheet>
    </>
  );
}
