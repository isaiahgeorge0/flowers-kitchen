"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cartTotals, useCart } from "@/lib/ordering/cart-store";
import { navLinks, orderHref, phone } from "@/lib/site";
import { BrandLogo } from "./BrandLogo";
import { buttonClasses } from "./Button";
import { NavLink } from "./NavLink";
import { SiteMenu } from "./SiteMenu";

const COLLAPSE_AFTER = 80;

const [menu, catering, story, findUs] = navLinks;

// Phones always get the floating pills. From lg up, the top of the page shows the full
// three-zone bar (data-top on the header) and it folds into pills once scrolled.
const pill =
  "flex items-center gap-1 rounded-pill border border-hairline bg-paper-glass p-1 shadow-soft backdrop-blur-lg transition-[background-color,border-color,box-shadow,padding] duration-300 ease-out lg:group-data-top/header:border-transparent lg:group-data-top/header:bg-transparent lg:group-data-top/header:p-0 lg:group-data-top/header:shadow-none lg:group-data-top/header:backdrop-blur-none";

// Links that only show in the full bar; collapsed away (and hidden from AT) once scrolled.
const foldAway =
  "invisible hidden max-w-0 items-center overflow-hidden opacity-0 transition-[max-width,opacity,visibility] duration-300 ease-out lg:flex lg:group-data-top/header:visible lg:group-data-top/header:max-w-72 lg:group-data-top/header:opacity-100";

const navLink =
  "inline-flex min-h-11 items-center whitespace-nowrap rounded-pill px-3 text-[15px] font-medium text-pimento decoration-sorrel decoration-1 underline-offset-[6px] hover:underline aria-[current=page]:underline";

export function Header() {
  const [top, setTop] = useState(true);
  const { count } = cartTotals(useCart());

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setTop(window.scrollY <= COLLAPSE_AFTER);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <header
        data-top={top || undefined}
        className="group/header fixed inset-x-0 top-0 z-40 transition-colors duration-300 ease-out lg:data-top:bg-cream"
      >
        {/* Once scrolled, page content fades out under the pills instead of running into them. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-linear-to-b from-cream from-70% to-cream/0 transition-opacity duration-300 ease-out group-data-top/header:opacity-0"
        />
        <div className="mx-auto grid h-20 max-w-content grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 transition-[height] duration-300 ease-out sm:px-6 md:px-8 lg:h-20 lg:group-data-top/header:h-24">
          {/* Left: phone, then Menu and Catering in the full bar */}
          <div className={`${pill} justify-self-start`}>
            <a
              href={phone.href}
              aria-label={`Call us on ${phone.display}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2.5 rounded-pill text-pimento transition-[padding,background-color] duration-300 ease-out hover:bg-pimento/[0.07] lg:px-4 lg:group-data-top/header:pl-0 lg:group-data-top/header:hover:bg-transparent"
            >
              <Phone aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-sorrel" />
              <span className="hidden whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.14em] tabular-nums lg:inline">
                {phone.display}
              </span>
            </a>
            <div className={`${foldAway} gap-1 lg:group-data-top/header:pl-3`}>
              <NavLink href={menu.href} className={navLink}>
                {menu.label}
              </NavLink>
              <NavLink href={catering.href} className={navLink}>
                {catering.label}
              </NavLink>
            </div>
          </div>

          {/* Centre: mark in a pill, or the full horizontal logo at the top of the page on desktop */}
          <div className={pill}>
            <Link
              href="/"
              className="relative flex h-11 w-11 items-center justify-center rounded-pill transition-[width,height] duration-300 ease-out lg:group-data-top/header:h-16 lg:group-data-top/header:w-44"
            >
              <BrandLogo
                src="/brand/flowers-kitchen_mark_full-colour.svg"
                width={32}
                height={32}
                loading="eager"
                className="size-8 transition-[opacity,visibility] duration-300 ease-out lg:group-data-top/header:invisible lg:group-data-top/header:opacity-0"
              />
              <BrandLogo
                src="/brand/flowers-kitchen_horizontal_full-colour.svg"
                width={678}
                height={231}
                className="invisible absolute top-1/2 left-1/2 h-auto w-44 max-w-none -translate-1/2 opacity-0 max-lg:hidden transition-[opacity,visibility] duration-300 ease-out lg:group-data-top/header:visible lg:group-data-top/header:opacity-100"
              />
            </Link>
          </div>

          {/* Right: Our Story and Find Us in the full bar, then Order online and the menu button */}
          <div className={`${pill} justify-self-end`}>
            <div className={`${foldAway} gap-1 lg:group-data-top/header:pr-3`}>
              <NavLink href={story.href} className={navLink}>
                {story.label}
              </NavLink>
              <NavLink href={findUs.href} className={navLink}>
                {findUs.label}
              </NavLink>
            </div>
            <Link href={orderHref} className={buttonClasses("primary", "md", "gap-2 px-4 sm:px-6")}>
              <span className="sm:hidden">Order</span>
              <span className="hidden sm:inline">Order online</span>
              {count > 0 && (
                <span className="-mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-cream px-1.5 text-[12px] font-semibold tracking-normal text-sorrel tabular-nums">
                  {count}
                  <span className="sr-only"> {count === 1 ? "box" : "boxes"} in your basket</span>
                </span>
              )}
            </Link>
            <SiteMenu className="transition-[opacity,visibility] duration-300 ease-out lg:group-data-top/header:invisible lg:group-data-top/header:hidden lg:group-data-top/header:opacity-0" />
          </div>
        </div>
      </header>
      {/* Holds the header's space so the page never shifts when it collapses. */}
      <div aria-hidden className="h-20 shrink-0 lg:h-24" />
    </>
  );
}
