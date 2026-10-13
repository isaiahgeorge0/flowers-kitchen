import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/Button";
import { AdminLoading, AdminPageHeader, StatusChip, adminCard } from "@/components/admin/AdminUi";
import { occasionLabel, type Occasion } from "@/lib/catering";
import { requireActiveAdmin } from "@/lib/admin/guards";
import {
  formatEventDate,
  formatTimestamp,
  isLeadStatus,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/admin/lead-status";
import {
  cleanLeadSearch,
  fetchLeadCounts,
  fetchLeads,
  LEADS_LIST_LIMIT,
  type LeadListItem,
} from "@/lib/admin/leads";

export const metadata: Metadata = { title: "Catering leads" };

function leadsHref(status: LeadStatus | null, search: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/admin/leads?${query}` : "/admin/leads";
}

const occasionName = (value: string) => occasionLabel(value as Occasion) ?? value;

export default function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  return (
    <>
      <AdminPageHeader eyebrow="Catering" title="Catering leads">
        Every enquiry from the catering page, newest first.
      </AdminPageHeader>
      <Suspense fallback={<AdminLoading label="Loading leads…" />}>
        <LeadsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LeadsContent({ searchParams }: Pick<PageProps<"/admin/leads">, "searchParams">) {
  const { supabase } = await requireActiveAdmin();
  const sp = await searchParams;
  const status = isLeadStatus(sp.status) ? sp.status : null;
  const search = cleanLeadSearch(typeof sp.q === "string" ? sp.q : undefined);

  const [{ leads, failed }, counts] = await Promise.all([
    fetchLeads(supabase, { status, search }),
    fetchLeadCounts(supabase),
  ]);

  const filters: { value: LeadStatus | null; label: string; count: number }[] = [
    { value: null, label: "All", count: counts.all },
    ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s], count: counts[s] })),
  ];

  return (
    <>
      <nav aria-label="Filter by status" className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-2">
          {filters.map((f) => {
            const active = f.value === status;
            return (
              <li key={f.label}>
                <Link
                  href={leadsHref(f.value, search)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-sm border px-4 text-[15px] font-semibold transition-colors duration-300 ease-out ${
                    active
                      ? "border-pimento bg-pimento text-cream"
                      : "border-hairline bg-paper text-pimento hover:border-pimento"
                  }`}
                >
                  {f.label}
                  <span className={active ? "text-cream" : "text-muted"}>{f.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Form action="/admin/leads" className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="flex-1">
          <label htmlFor="lead-search" className="block text-[15px] font-semibold">
            Search by name or email
          </label>
          <input
            id="lead-search"
            name="q"
            type="search"
            defaultValue={search}
            maxLength={80}
            autoComplete="off"
            className="mt-2 block min-h-12 w-full rounded-sm border border-hairline bg-paper px-4 py-2.5 text-[17px] text-pimento"
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Search
          </button>
          {search && (
            <Link href={leadsHref(status, "")} className={buttonClasses("secondary", "md", "border-hairline")}>
              Clear
            </Link>
          )}
        </div>
      </Form>

      <div className="mt-8">
        {failed ? (
          <p className={`${adminCard} px-5 py-4 text-sorrel`} role="alert">
            We couldn&rsquo;t load leads just now. Refresh the page to try again.
          </p>
        ) : leads.length === 0 ? (
          <EmptyState filtered={Boolean(status || search)} />
        ) : (
          <>
            <LeadCards leads={leads} />
            <LeadTable leads={leads} />
            {leads.length === LEADS_LIST_LIMIT && (
              <p className="mt-4 text-[15px] text-muted">
                Showing the newest {LEADS_LIST_LIMIT}. Use search or a status to find older leads.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className={`${adminCard} px-6 py-10 text-center`}>
      {filtered ? (
        <>
          <p className="font-semibold">No leads match.</p>
          <Link href="/admin/leads" className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            Show all leads
          </Link>
        </>
      ) : (
        <>
          <p className="font-semibold">No enquiries yet.</p>
          <p className="mt-2 text-muted">
            They&rsquo;ll appear here as soon as someone sends one from the catering page.
          </p>
        </>
      )}
    </div>
  );
}

function LeadCards({ leads }: { leads: LeadListItem[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link
            href={`/admin/leads/${lead.id}`}
            className={`${adminCard} block p-5 transition-colors duration-300 ease-out hover:border-pimento`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{lead.name}</span>
                <span className="block truncate text-[15px] text-muted">{lead.email}</span>
              </span>
              <StatusChip status={lead.status} />
            </span>
            <span className="mt-3 block text-[15px]">
              {occasionName(lead.occasion)} · {lead.guests} guests · {formatEventDate(lead.eventDate)}
            </span>
            <span className="mt-1 block text-[15px] text-muted">
              Received {formatTimestamp(lead.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LeadTable({ leads }: { leads: LeadListItem[] }) {
  const th = "px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.12em] text-muted";
  return (
    <div className={`${adminCard} hidden overflow-hidden md:block`}>
      <table className="w-full text-[15px]">
        <thead className="border-b border-hairline">
          <tr>
            <th scope="col" className={th}>Name</th>
            <th scope="col" className={th}>Occasion</th>
            <th scope="col" className={`${th} text-right`}>Guests</th>
            <th scope="col" className={th}>Event date</th>
            <th scope="col" className={th}>Received</th>
            <th scope="col" className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-hairline first:border-t-0 hover:bg-cream">
              <td className="max-w-56 px-4 py-3">
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="block truncate font-semibold underline-offset-4 hover:underline"
                >
                  {lead.name}
                </Link>
                <span className="block truncate text-muted">{lead.email}</span>
              </td>
              <td className="px-4 py-3">{occasionName(lead.occasion)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{lead.guests}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatEventDate(lead.eventDate)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatTimestamp(lead.createdAt)}</td>
              <td className="px-4 py-3">
                <StatusChip status={lead.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
