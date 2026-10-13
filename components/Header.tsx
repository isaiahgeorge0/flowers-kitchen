import Image from "next/image";
import Link from "next/link";
import { navLinks, preOrderHref } from "@/lib/site";
import { LinkButton } from "./Button";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-cream">
      <div className="mx-auto flex h-18 max-w-content items-center justify-between gap-6 px-6 md:h-20 md:px-8">
        <Link href="/" className="shrink-0">
          <Image
            src="/brand/flowers-kitchen_horizontal_full-colour.svg"
            alt="Flowers Kitchen"
            width={678}
            height={231}
            loading="eager"
            className="h-auto w-40 md:w-44"
          />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-[15px] font-medium text-pimento decoration-sorrel decoration-1 underline-offset-[6px] hover:underline aria-[current=page]:underline"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <LinkButton href={preOrderHref}>Pre-order</LinkButton>
            </li>
          </ul>
        </nav>

        <MobileMenu />
      </div>
    </header>
  );
}
