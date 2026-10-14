import type { ReactNode } from "react";
import { Eyebrow } from "@/components/Eyebrow";
import { LEAD_STATUS_CHIP, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/admin/lead-status";

export const adminInput =
  "mt-2 block min-h-12 w-full rounded-input border border-hairline bg-cream px-4 py-2.5 text-[17px] text-pimento disabled:cursor-not-allowed disabled:opacity-60";

export const adminLabel = "block text-[15px] font-semibold text-pimento";

export const adminCard = "rounded-card border border-hairline bg-paper";

export const adminH2 = "font-display text-2xl font-semibold leading-tight tracking-[-0.01em]";

export function AdminPageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 md:mb-10">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-4 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.015em] md:text-[44px]">
        {title}
      </h1>
      {children && <div className="mt-3 max-w-2xl text-muted">{children}</div>}
    </header>
  );
}

/** Suspense fallback while a page's data streams in. */
export function AdminLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className={`${adminCard} px-6 py-10 text-center text-muted`}>
      {label}
    </div>
  );
}

export function StatusChip({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-pill border px-2.5 text-[13px] font-semibold uppercase leading-none tracking-[0.08em] ${LEAD_STATUS_CHIP[status]}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

/** For staff whose account doesn't include this part of the admin. */
export function NoAccess({ area }: { area: string }) {
  return (
    <p className={`${adminCard} px-6 py-10 text-center text-muted`}>
      Your account doesn&rsquo;t have access to {area}. Ask the owner if you need it.
    </p>
  );
}

export function EmailNotSentChip() {
  return (
    <span className="inline-flex min-h-7 items-center whitespace-nowrap rounded-pill border border-sorrel px-2.5 text-[13px] font-semibold uppercase leading-none tracking-[0.08em] text-sorrel">
      Email not sent
    </span>
  );
}
