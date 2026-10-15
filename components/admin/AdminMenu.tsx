"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import type { NavAccess } from "@/lib/admin/nav";
import { AdminNavList } from "./AdminNav";

export type AdminMenuProps = {
  displayName: string;
  roleLabel: string;
  signOutSlot: ReactNode;
  access: NavAccess;
};

/**
 * The Menu button and the admin nav it opens. `sheet` covers the screen (phone header); `drawer`
 * slides over the left of the page on wider screens (kitchen board top bar).
 */
export function AdminMenu({
  displayName,
  roleLabel,
  signOutSlot,
  access,
  tone = "dark",
  layout = "sheet",
}: AdminMenuProps & { tone?: "dark" | "light"; layout?: "sheet" | "drawer" }) {
  const dialogId = useId();
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
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        className={`-mr-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-3 px-2 text-[15px] font-semibold uppercase tracking-[0.08em] ${
          tone === "light" ? "text-pimento" : ""
        }`}
      >
        <span className={layout === "drawer" ? "max-sm:sr-only" : ""}>Menu</span>
        <span aria-hidden className="flex w-6 flex-col gap-1.5">
          <span className="h-0.5 bg-current" />
          <span className="h-0.5 bg-current" />
        </span>
      </button>

      <dialog
        id={dialogId}
        ref={dialogRef}
        aria-label="Admin menu"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        className={`m-0 h-dvh max-h-none bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)] open:flex open:flex-col motion-safe:open:animate-fade-rise ${
          layout === "drawer"
            ? "w-full max-w-none backdrop:bg-transparent sm:w-80 sm:backdrop:bg-pimento/40"
            : "w-full max-w-none backdrop:bg-transparent"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-allspice px-5">
          <Link href="/admin" onClick={closeMenu} className="shrink-0">
            <Image
              src="/brand/flowers-kitchen_horizontal_reverse-green.svg"
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
            <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto py-6">
          <AdminNavList access={access} onNavigate={closeMenu} />
        </nav>

        <div className="border-t border-allspice px-5 py-6">
          <p className="font-semibold">{displayName}</p>
          <p className="text-[15px] text-mountain-muted">{roleLabel}</p>
          <div className="mt-4">{signOutSlot}</div>
        </div>
      </dialog>
    </>
  );
}
