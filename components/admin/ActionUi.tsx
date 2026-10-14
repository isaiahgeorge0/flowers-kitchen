"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/Button";
import type { AdminActionState } from "@/lib/admin/types";

export function ActionFeedback({
  state,
  className = "",
}: {
  state: AdminActionState;
  className?: string;
}) {
  return (
    <div aria-live="polite" className={className}>
      {state.at !== 0 &&
        (state.ok ? (
          <p role="status" className="text-[15px] font-semibold text-mountain">
            {state.message}
          </p>
        ) : (
          <p
            role="alert"
            className="rounded-card border border-sorrel bg-paper px-4 py-3 text-[15px] text-sorrel"
          >
            {state.message}
          </p>
        ))}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={buttonClasses(variant, size, className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
