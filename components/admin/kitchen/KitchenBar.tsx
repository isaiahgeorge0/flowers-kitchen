import Image from "next/image";
import type { ReactNode } from "react";

/** The kitchen board's slim top bar, in place of the admin sidebar below 1440px. */
export function KitchenBar({ children }: { children?: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-4 flex h-16 items-center gap-2 border-b border-hairline bg-paper px-4 min-[1440px]:hidden sm:gap-4">
      <Image
        src="/brand/flowers-kitchen_mark_full-colour.svg"
        alt="Flowers Kitchen"
        width={40}
        height={40}
        loading="eager"
        className="size-8 shrink-0 sm:size-9"
      />
      <p aria-hidden className="font-display text-[20px] font-semibold leading-none sm:text-[24px]">
        Orders
      </p>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">{children}</div>
    </div>
  );
}
