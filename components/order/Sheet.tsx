"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const variants = {
  // Bottom sheet on phones, centred dialog from md up.
  dialog: "mt-auto w-full max-h-[92dvh] border-t md:m-auto md:max-w-lg md:rounded-card md:border",
  // Bottom sheet on phones, panel on the right from md up.
  drawer: "mt-auto w-full max-h-[88dvh] border-t md:my-3 md:mr-3 md:ml-auto md:h-[calc(100dvh-1.5rem)] md:max-h-none md:max-w-md md:rounded-card md:border",
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
      className={`m-0 max-w-none overflow-hidden rounded-t-card border-hairline shadow-lift bg-paper p-0 text-pimento backdrop:bg-pimento/60 open:flex open:flex-col motion-safe:open:animate-fade-rise ${variants[variant]}`}
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
      aria-label={label}
      className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-hairline text-pimento transition-colors duration-300 ease-out hover:border-pimento hover:bg-pimento/[0.05]"
    >
      <X aria-hidden strokeWidth={1.5} className="size-5" />
    </button>
  );
}
