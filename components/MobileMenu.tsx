"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { navLinks, preOrderHref } from "@/lib/site";
import { LinkButton } from "./Button";
import { NavLink } from "./NavLink";
import { ServiceNote } from "./ServiceNote";

export function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function openMenu() {
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="-mr-2 inline-flex min-h-11 min-w-11 items-center gap-3 px-2 text-[15px] font-semibold uppercase tracking-[0.08em] text-pimento"
      >
        Menu
        <span aria-hidden className="flex w-6 flex-col gap-1.5">
          <span className="h-0.5 bg-current" />
          <span className="h-0.5 bg-current" />
        </span>
      </button>

      <dialog
        id="mobile-menu"
        ref={dialogRef}
        aria-label="Site menu"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-cream text-pimento backdrop:bg-transparent open:flex open:flex-col motion-safe:open:animate-fade-rise"
      >
        <div className="flex h-18 shrink-0 items-center justify-between gap-6 border-b border-hairline px-6">
          <Link href="/" onClick={closeMenu} className="shrink-0">
            <Image
              src="/brand/flowers-kitchen_horizontal_full-colour.svg"
              alt="Flowers Kitchen"
              width={678}
              height={231}
              className="h-auto w-40"
            />
          </Link>
          <button
            type="button"
            onClick={closeMenu}
            className="-mr-2 inline-flex min-h-11 min-w-11 items-center gap-3 px-2 text-[15px] font-semibold uppercase tracking-[0.08em]"
          >
            Close
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col px-6 py-12">
          <ul className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  onClick={closeMenu}
                  className="inline-flex min-h-14 items-center font-display text-4xl font-medium tracking-[-0.015em] decoration-sorrel decoration-2 underline-offset-8 aria-[current=page]:underline"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-4 pt-12">
            <LinkButton href={preOrderHref} onClick={closeMenu}>
              Pre-order
            </LinkButton>
            <ServiceNote className="text-center text-[15px] text-muted" />
          </div>
        </nav>
      </dialog>
    </div>
  );
}
