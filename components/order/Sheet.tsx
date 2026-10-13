"use client";

import { useEffect, useRef, type ReactNode } from "react";

const variants = {
  // Bottom sheet on phones, centred dialog from md up.
  dialog: "mt-auto w-full max-h-[92dvh] border-t md:m-auto md:max-w-lg md:rounded-sm md:border",
  // Bottom sheet on phones, panel on the right from md up.
  drawer: "mt-auto w-full max-h-[88dvh] border-t md:mr-0 md:mt-0 md:ml-auto md:h-dvh md:max-h-dvh md:max-w-md md:border-t-0 md:border-l",
};

export function Sheet({
  open,
  onClose,
  labelledBy,
  variant = "dialog",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-0 max-w-none overflow-hidden rounded-t-sm border-hairline bg-paper p-0 text-pimento backdrop:bg-pimento/60 open:flex open:flex-col motion-safe:open:animate-fade-rise ${variants[variant]}`}
    >
      {children}
    </dialog>
  );
}

export function SheetClose({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mr-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 px-2 text-[15px] font-semibold uppercase tracking-[0.08em] text-pimento"
    >
      {label}
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    </button>
  );
}
