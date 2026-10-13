import type { Box } from "@/lib/menu";
import { SIDES } from "@/lib/menu";
import { preOrderHref } from "@/lib/site";
import { LinkButton } from "./Button";
import { Dotted } from "./Dotted";
import { Eyebrow } from "./Eyebrow";
import { Photo } from "./Photo";

export function BoxCard({ box }: { box: Box }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-sm border border-hairline bg-paper">
      <div className="p-3 pb-0">
        <Photo
          src={box.image}
          alt={`${box.name} box`}
          aspect="4/3"
          caption="Food photo"
          sizes="(min-width: 1024px) 384px, 100vw"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        {box.note && <Eyebrow>{box.note}</Eyebrow>}
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-[-0.01em]">
          {box.name}
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          <Dotted items={SIDES.split(" · ")} />
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          <p className="font-display text-2xl font-semibold text-sorrel">
            {box.price}
          </p>
          <LinkButton href={preOrderHref} size="sm">
            Pre-order<span className="sr-only"> {box.name}</span>
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
