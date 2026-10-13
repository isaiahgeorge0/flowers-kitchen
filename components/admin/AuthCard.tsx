import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/Eyebrow";
import { adminCard } from "./AdminUi";

/** Centred brand card for the signed-out admin pages. */
export function AuthCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto block w-40">
          <Image
            src="/brand/flowers-kitchen_primary_full-colour.svg"
            alt="Flowers Kitchen"
            width={545}
            height={477}
            loading="eager"
            className="h-auto w-40"
          />
        </Link>
        <div className={`${adminCard} mt-10 p-6 md:p-8`}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.015em]">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-[15px] text-muted underline-offset-[6px] hover:underline"
          >
            Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}
