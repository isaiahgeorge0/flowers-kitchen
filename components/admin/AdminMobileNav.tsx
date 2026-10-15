"use client";

import Image from "next/image";
import Link from "next/link";
import { AdminMenu, type AdminMenuProps } from "./AdminMenu";

/** Phone and tablet header. The kitchen board has its own top bar, so this hides there. */
export function AdminMobileNav(props: AdminMenuProps) {
  return (
    <div className="sticky top-0 z-40 bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)] group-has-[[data-kitchen]]/shell:hidden lg:hidden">
      <div className="flex h-16 items-center justify-between gap-4 px-5">
        <Link href="/admin" className="shrink-0">
          <Image
            src="/brand/flowers-kitchen_horizontal_reverse-green.svg"
            alt="Flowers Kitchen"
            width={678}
            height={231}
            loading="eager"
            className="h-auto w-40"
          />
        </Link>
        <AdminMenu {...props} />
      </div>
    </div>
  );
}
