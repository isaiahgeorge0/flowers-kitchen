import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { buttonClasses } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { AdminLoading, NoAccess, StatusChip, adminCard, adminH2 } from "@/components/admin/AdminUi";
import { LeadConfirmationStatus, LeadDetailsForm, LeadStatusPicker } from "@/components/admin/LeadManager";
import { mainName, occasionLabel, serviceLabel, type Occasion, type ServiceStyle } from "@/lib/catering";
import { emailOverdue } from "@/lib/admin/email-status";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { formatEventDate, formatQuote, formatTimestamp } from "@/lib/admin/lead-status";
import { fetchLead, type Lead } from "@/lib/admin/leads";

export const metadata: Metadata = { title: "Lead" };

function replyHref(lead: Lead) {
  const occasion = lead.occasion === "other" ? null : occasionLabel(lead.occasion as Occasion);
  const subject = occasion
    ? `Your ${occasion.toLowerCase()} catering enquiry | Flowers Kitchen`
    : "Your catering enquiry | Flowers Kitchen";
  const firstName = lead.name.trim().split(/\s+/)[0];
  const body = `Hi ${firstName},\n\nThank you for your catering enquiry for ${formatEventDate(lead.eventDate)} (${lead.guests} guests).\n\n`;
  return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export default function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  return (
    <>
      <Link
        href="/admin/leads"
        className="-mt-2 mb-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-muted hover:text-pimento"
      >
        <span aria-hidden>←</span> All leads
      </Link>
      <Suspense fallback={<AdminLoading label="Loading lead…" />}>
        <LeadContent params={params} />
      </Suspense>
    </>
  );
}

async function LeadContent({ params }: Pick<PageProps<"/admin/leads/[id]">, "params">) {
  const { supabase, adminUser } = await requireActiveAdmin();
  if (!adminUser.canManageCatering) return <NoAccess area="catering leads" />;
  const { id } = await params;
  const lead = await fetchLead(supabase, id);

  if (!lead) {
    return (
      <div className={`${adminCard} px-6 py-10 text-center`}>
        <h1 className={adminH2}>We couldn&rsquo;t find that lead</h1>
        <Link href="/admin/leads" className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
          Back to catering leads
        </Link>
      </div>
    );
  }

  const occasion = occasionLabel(lead.occasion as Occasion) ?? lead.occasion;

  return (
    <>
      <header className="mb-8">
        <Eyebrow>{occasion} enquiry</Eyebrow>
        <h1 className="mt-4 break-words font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.015em] md:text-[44px]">
          {lead.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-muted">
          <StatusChip status={lead.status} />
          <span>Received {formatTimestamp(lead.createdAt)}</span>
          <span>Updated {formatTimestamp(lead.updatedAt)}</span>
        </div>
        <LeadConfirmationStatus id={lead.id} overdue={emailOverdue(lead.confirmationEmailSentAt, lead.createdAt)} />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a href={replyHref(lead)} className={buttonClasses("primary", "md")}>
            Reply by email
          </a>
          {lead.phone && (
            <a href={telHref(lead.phone)} className={buttonClasses("secondary", "md")}>
              Call {lead.phone}
            </a>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-first flex flex-col gap-6 lg:order-last">
          <LeadStatusPicker id={lead.id} status={lead.status} />
          <LeadDetailsForm
            id={lead.id}
            quotedAmount={lead.quotedAmount}
            internalNotes={lead.internalNotes}
          />
        </div>

        <section className={`${adminCard} p-6`} aria-labelledby="event-heading">
          <h2 id="event-heading" className={adminH2}>
            The event
          </h2>
          <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Detail label="Date">
              {formatEventDate(lead.eventDate)}, {lead.eventTime}
            </Detail>
            <Detail label="Guests">{lead.guests}</Detail>
            <Detail label="Service">{serviceLabel(lead.service as ServiceStyle) ?? lead.service}</Detail>
            <Detail label="Postcode">{lead.postcode}</Detail>
            <Detail label="Boxes" wide>
              {lead.mains.length ? lead.mains.map(mainName).join(", ") : "None chosen"}
            </Detail>
            <Detail label="Extras" wide>
              {lead.extras.length ? lead.extras.join(", ") : "None"}
            </Detail>
            <Detail label="Email" wide>
              <a href={`mailto:${lead.email}`} className="break-all underline underline-offset-4">
                {lead.email}
              </a>
            </Detail>
            <Detail label="Phone">
              {lead.phone ? (
                <a href={telHref(lead.phone)} className="underline underline-offset-4">
                  {lead.phone}
                </a>
              ) : (
                "Not given"
              )}
            </Detail>
            <Detail label="Quoted">
              {lead.quotedAmount === null ? "Not yet" : formatQuote(lead.quotedAmount)}
            </Detail>
            <Detail label="Their message" wide>
              {lead.notes ? <span className="whitespace-pre-wrap">{lead.notes}</span> : "No message"}
            </Detail>
            <Detail label="Estimate they saw" wide>
              <span className="whitespace-pre-wrap">{lead.estimateText}</span>
            </Detail>
          </dl>
        </section>
      </div>
    </>
  );
}

function Detail({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
