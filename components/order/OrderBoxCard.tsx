import { Plus } from "lucide-react";
import { cardBody, cardFrame, cardLift } from "@/components/BoxCard";
import { Button } from "@/components/Button";
import { Dotted } from "@/components/Dotted";
import { Photo } from "@/components/Photo";
import { formatPence } from "@/lib/ordering/money";
import { boxSidesLine, boxSidesNote } from "@/lib/ordering/sides";
import type { MenuBox } from "@/lib/ordering/types";
import { caps, h3 } from "@/lib/typography";

export function OrderBoxCard({ box, canOrder, onAdd }: { box: MenuBox; canOrder: boolean; onAdd: () => void }) {
  // Only local images: remote hosts would need adding to next.config first.
  const image = box.imageUrl?.startsWith("/") ? box.imageUrl : undefined;
  const interactive = canOrder && !box.soldOut;
  const sides = boxSidesLine(box);
  const sidesNote = box.soldOut ? null : boxSidesNote(box);

  return (
    <article className={`${cardFrame} ${interactive ? cardLift : ""} ${box.soldOut ? "text-muted" : ""}`}>
      <div className={box.soldOut ? "opacity-60 grayscale" : ""}>
        <Photo src={image} alt={`${box.name} box`} aspect="4/3" caption="Food photo" sizes="(min-width: 1024px) 384px, 100vw" inset />
      </div>

      <div className={cardBody}>
        <h3 className={h3}>{box.name}</h3>
        {sides.length > 0 ? (
          <div className="text-[15px] leading-[1.55] text-muted">
            <p>
              <Dotted items={sides} />
            </p>
            {sidesNote && <p className="mt-1 font-semibold text-sorrel" data-sides-note>{sidesNote}</p>}
          </div>
        ) : (
          box.description && <p className="text-[15px] leading-[1.55] text-muted">{box.description}</p>
        )}
        <p className="text-[15px] leading-[1.55] text-muted">
          <span className="font-semibold text-pimento">Allergens:</span> {box.allergens || "To be confirmed"}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <p className={`font-display text-[26px] font-semibold leading-none ${box.soldOut ? "text-muted line-through" : "text-sorrel"}`}>
            {formatPence(box.pricePence)}
          </p>
          {box.soldOut ? (
            <p className={`inline-flex min-h-11 items-center rounded-pill border border-hairline px-5 ${caps} tracking-[0.08em] text-muted`}>
              <span aria-hidden>Sold out today</span>
              <span className="sr-only">{box.name}, sold out today</span>
            </p>
          ) : (
            <Button onClick={onAdd} disabled={!canOrder} aria-haspopup="dialog" className="pl-5">
              <Plus aria-hidden strokeWidth={1.5} className="-ml-1 size-[18px]" />
              Add<span className="sr-only"> {box.name}</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
