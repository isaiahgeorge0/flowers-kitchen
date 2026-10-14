"use client";

import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { navLinks, orderHref, phone } from "@/lib/site";
import { BrandLogo } from "./BrandLogo";
import { LinkButton } from "./Button";
import { NavLink } from "./NavLink";
import { ServiceNote } from "./ServiceNote";

/** Menu button plus the full-screen site menu it opens. */
export function SiteMenu({ className = "" }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function openMenu() {
    flushSync(() => setOpen(true));
    dialogRef.current?.showModal();
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label="Menu"
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-pimento transition-colors duration-300 ease-out hover:bg-pimento/[0.07] ${className}`}
      >
        <Menu aria-hidden strokeWidth={1.5} className="size-6" />
      </button>

      <dialog
        id="site-menu"
        ref={dialogRef}
        aria-label="Site menu"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-cream text-pimento backdrop:bg-transparent open:flex open:flex-col motion-safe:open:animate-fade-rise"
      >
        {open && <MenuContents onClose={closeMenu} />}
      </dialog>
    </>
  );
}

function MenuContents({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="mx-auto flex h-20 w-full max-w-content shrink-0 items-center justify-between gap-6 px-6 md:px-8 lg:h-24">
        <Link href="/" onClick={onClose} className="shrink-0">
          <BrandLogo
            src="/brand/flowers-kitchen_horizontal_full-colour.svg"
            width={678}
            height={231}
            className="h-auto w-40 lg:w-44"
          />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="-mr-3 inline-flex min-h-11 items-center gap-2 rounded-pill px-3 text-[15px] font-semibold uppercase tracking-[0.08em] transition-colors duration-300 ease-out hover:bg-pimento/[0.07]"
        >
          Close
          <X aria-hidden strokeWidth={1.5} className="size-6" />
        </button>
      </div>

      <nav aria-label="Main" className="mx-auto flex w-full max-w-content flex-1 flex-col px-6 pt-10 pb-10 md:px-8 lg:pt-16">
        <ul className="flex flex-col gap-1 lg:gap-3">
          {navLinks.map((link) => (
            <li key={link.href}>
              <NavLink
                href={link.href}
                onClick={onClose}
                className="inline-flex min-h-14 items-center font-display text-[40px] font-medium leading-none tracking-[-0.015em] decoration-sorrel decoration-2 underline-offset-8 hover:underline aria-[current=page]:underline lg:text-[56px] lg:min-h-18"
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-6 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={phone.href}
            className="inline-flex min-h-11 items-center gap-3 text-[15px] font-semibold tracking-[0.12em] tabular-nums"
          >
            <Phone aria-hidden strokeWidth={1.5} className="size-5 text-sorrel" />
            <span>
              <span className="sr-only">Call us on </span>
              {phone.display}
            </span>
          </a>
          <div className="flex flex-col gap-4 sm:items-end">
            <LinkButton href={orderHref} onClick={onClose} size="lg" arrow>
              Order online
            </LinkButton>
            <ServiceNote className="text-center sm:text-right" />
          </div>
        </div>
      </nav>
    </>
  );
}
