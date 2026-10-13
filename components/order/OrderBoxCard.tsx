import { Button } from "@/components/Button";
import { Photo } from "@/components/Photo";
import { SIDES } from "@/lib/menu";
import { formatPence } from "@/lib/ordering/money";
import type { MenuBox } from "@/lib/ordering/types";

export function OrderBoxCard({ box, canOrder, onAdd }: { box: MenuBox; canOrder: boolean; onAdd: () => void }) {
  // Only local images: remote hosts would need adding to next.config first.
  const image = box.imageUrl?.startsWith("/") ? box.imageUrl : undefined;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-sm border border-hairline bg-paper ${box.soldOut ? "text-muted" : ""}`}
    >
      <div className={`relative p-3 pb-0 ${box.soldOut ? "opacity-60 grayscale" : ""}`}>
        <Photo src={image} alt={`${box.name} box`} aspect="4/3" caption="Food photo" sizes="(min-width: 1024px) 384px, 100vw" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-[-0.01em]">{box.name}</h3>
        <p className="text-[15px] leading-relaxed text-muted">{box.description || SIDES}</p>
        <p className="text-[15px] leading-relaxed text-muted">
          <span className="font-semibold text-pimento">Allergens:</span> {box.allergens || "To be confirmed"}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          <p className={`font-display text-2xl font-semibold ${box.soldOut ? "text-muted line-through" : "text-sorrel"}`}>
            {formatPence(box.pricePence)}
          </p>
          {box.soldOut ? (
            <p className="inline-flex min-h-11 items-center rounded-sm border border-hairline px-4 text-[15px] font-semibold uppercase tracking-[0.08em] text-muted">
              Sold out<span className="sr-only"> — {box.name}</span>
            </p>
          ) : (
            <Button size="sm" onClick={onAdd} disabled={!canOrder} aria-haspopup="dialog">
              Add<span className="sr-only"> {box.name}</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
