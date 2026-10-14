import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LinkButton } from "@/components/Button";
import { AdminLoading, AdminPageHeader, NoAccess, StatusChip, adminCard, adminH2 } from "@/components/admin/AdminUi";
import { BUSINESS_TIME_ZONE, occasionLabel, todayISO, type Occasion } from "@/lib/catering";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { formatEventDate } from "@/lib/admin/lead-status";
import { fetchLeadCounts, fetchUpcomingEvents } from "@/lib/admin/leads";
import { fetchTodayOrderStats } from "@/lib/admin/orders";
import { formatPence } from "@/lib/ordering/money";

export const metadata: Metadata = { title: "Dashboard" };

const UPCOMING_DAYS = 30;

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  return (
    <>
      <AdminPageHeader eyebrow="Admin" title="Dashboard">
        Where orders and catering stand today.
      </AdminPageHeader>
      <Suspense fallback={<AdminLoading />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

async function DashboardContent() {
  const { supabase, adminUser } = await requireActiveAdmin();
  const today = todayISO(BUSINESS_TIME_ZONE);

  const catering = adminUser.canManageCatering;
  const [counts, upcoming, orderStats] = await Promise.all([
    catering ? fetchLeadCounts(supabase) : undefined,
    catering ? fetchUpcomingEvents(supabase, today, addDays(today, UPCOMING_DAYS)) : [],
    adminUser.canManageOrders ? fetchTodayOrderStats(supabase) : Promise.resolve(undefined),
  ]);

  if (!counts && orderStats === undefined) return <NoAccess area="orders or catering" />;

  return (
    <>
      {orderStats !== undefined && (
        <section aria-labelledby="orders-today-heading" className="mb-10">
          <h2 id="orders-today-heading" className={`${adminH2} mb-4`}>
            Orders today
          </h2>
          {orderStats === null ? (
            <p role="alert" className={`${adminCard} px-6 py-5 text-sorrel`}>
              We couldn&rsquo;t load today&rsquo;s orders. Refresh to try again.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  label="In the kitchen"
                  value={orderStats.pending}
                  note="New, preparing or ready"
                  href="/admin/orders"
                  accent
                />
                <Stat
                  label="Orders"
                  value={orderStats.orders}
                  note={`Paid online today · ${orderStats.web} web, ${orderStats.qr} QR`}
                  href="/admin/orders/history"
                />
                <Stat
                  label="Takings"
                  value={formatPence(orderStats.revenuePence)}
                  note="Paid today, after refunds"
                  href="/admin/orders/history"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_2fr]">
                <Stat
                  label="Upcoming today"
                  value={orderStats.upcomingToday}
                  note="Booked for a later time today"
                  href="/admin/orders"
                />
                <Link
                  href="/admin/orders"
                  className={`${adminCard} block p-6 transition-colors duration-300 ease-out hover:border-pimento`}
                >
                  <span className="block text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">
                    Scheduled · next 7 days
                  </span>
                  <ul className="mt-4 grid grid-cols-7 gap-1 text-center" aria-label="Scheduled orders by day">
                    {orderStats.nextDays.map((day) => (
                      <li key={day.date} className="border-t border-hairline pt-2">
                        <span className="block font-display text-[28px] font-semibold leading-none">
                          {day.orders}
                          <span className="sr-only"> {day.orders === 1 ? "order" : "orders"} on</span>
                        </span>
                        <span className="mt-1 block text-[13px] leading-tight text-muted">
                          {day.label.split(" ")[0]}
                          <span className="block">{day.label.split(" ").slice(1).join(" ")}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Link>
              </div>
            </>
          )}
        </section>
      )}

      {counts && (
        <>
          <h2 className={`${adminH2} mb-4`}>Catering</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="New leads" value={counts.new} note="Waiting for a reply" href="/admin/leads?status=new" accent />
            <Stat label="Quoted" value={counts.quoted} note="Waiting on the customer" href="/admin/leads?status=quoted" />
            <Stat label="Booked" value={counts.booked} note="Confirmed events" href="/admin/leads?status=booked" />
          </div>

          <section className={`${adminCard} mt-8 p-6`} aria-labelledby="upcoming-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="upcoming-heading" className={adminH2}>
                  Coming up
                </h2>
                <p className="mt-1 text-[15px] text-muted">
                  Booked and quoted events in the next {UPCOMING_DAYS} days.
                </p>
              </div>
            </div>

            {upcoming.length === 0 ? (
              <p className="mt-6 text-muted">Nothing booked or quoted for the next {UPCOMING_DAYS} days.</p>
            ) : (
              <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
                {upcoming.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="flex flex-col gap-2 py-4 hover:text-sorrel sm:flex-row sm:items-center sm:gap-6"
                    >
                      <span className="font-semibold sm:w-44 sm:shrink-0">{formatEventDate(lead.eventDate)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{lead.name}</span>
                        <span className="block text-[15px] text-muted">
                          {occasionLabel(lead.occasion as Occasion) ?? lead.occasion} · {lead.guests} guests
                        </span>
                      </span>
                      <StatusChip status={lead.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6">
              <LinkButton href="/admin/leads" variant="secondary">
                All catering leads
              </LinkButton>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  note,
  href,
  accent = false,
}: {
  label: string;
  value: number | string;
  note: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${adminCard} block p-6 transition-colors duration-300 ease-out hover:border-pimento`}
    >
      <span className="block text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</span>
      <span className={`mt-2 block font-display text-[56px] font-semibold leading-none ${accent ? "text-sorrel" : ""}`}>
        {value}
      </span>
      <span className="mt-3 block text-[15px] text-muted">{note}</span>
    </Link>
  );
}
