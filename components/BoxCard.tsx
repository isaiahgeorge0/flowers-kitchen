import type { Box } from "@/lib/menu";
import { SIDES } from "@/lib/menu";
import { orderHref } from "@/lib/site";
import { h3 } from "@/lib/typography";
import { LinkButton } from "./Button";
import { Dotted } from "./Dotted";
import { Eyebrow } from "./Eyebrow";
import { Photo } from "./Photo";

/** Card chrome shared by the menu and order cards: padding, hover lift, bottom-aligned footer. */
export const cardFrame =
  "flex h-full flex-col rounded-card border border-hairline bg-paper p-1.5";
export const cardLift =
  "transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-lift motion-reduce:hover:translate-y-0";
export const cardBody = "flex flex-1 flex-col gap-2.5 px-3.5 pt-5 pb-3.5 md:px-4.5 md:pt-6 md:pb-4.5";

export function BoxCard({ box, price = box.price }: { box: Box; price?: string }) {
  return (
    <article className={`${cardFrame} ${cardLift}`}>
      <Photo
        src={box.image}
        alt={`${box.name} box`}
        aspect="4/3"
        caption="Food photo"
        sizes="(min-width: 1024px) 384px, 100vw"
        inset
      />

      <div className={cardBody}>
        {box.note && <Eyebrow>{box.note}</Eyebrow>}
        <h3 className={h3}>{box.name}</h3>
        <p className="text-[15px] leading-[1.55] text-muted">
          <Dotted items={SIDES.split(" · ")} />
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <p className="font-display text-[26px] font-semibold leading-none text-sorrel">{price}</p>
          <LinkButton href={orderHref} variant="secondary">
            Order<span className="sr-only"> {box.name}</span>
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
