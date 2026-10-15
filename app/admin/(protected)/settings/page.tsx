import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AcceptingOrdersSwitch } from "@/components/admin/AcceptingOrdersSwitch";
import { AdminLoading, AdminPageHeader, adminCard, adminH2 } from "@/components/admin/AdminUi";
import { CollectionSettingsForm } from "@/components/admin/CollectionSettingsForm";
import { DailyResetSwitch } from "@/components/admin/DailyResetSwitch";
import { OpeningHoursForm } from "@/components/admin/OpeningHoursForm";
import { buttonClasses } from "@/components/Button";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { openingHoursRows, orderingStatus } from "@/lib/ordering/hours";
import { readOrderingSettings } from "@/lib/ordering/menu";
import { canSchedule } from "@/lib/ordering/schedule";
import { qrOrderUrl } from "@/lib/qr/order-qr";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <AdminPageHeader eyebrow="Ordering" title="Settings">
        Switch online orders on and off, and set when customers can order.
      </AdminPageHeader>
      <Suspense fallback={<AdminLoading />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

async function SettingsContent() {
  const { supabase, adminUser } = await requireActiveAdmin();
  if (!adminUser.canManageMenus && !adminUser.canManageOrders) {
    return (
      <p className={`${adminCard} px-6 py-10 text-center text-muted`}>
        Your account doesn&rsquo;t have access to ordering settings. Ask the owner if you need it.
      </p>
    );
  }

  let settings;
  try {
    settings = await readOrderingSettings(supabase);
  } catch {
    return (
      <p role="alert" className={`${adminCard} px-6 py-10 text-center text-sorrel`}>
        We couldn&rsquo;t load the settings. Refresh to try again.
      </p>
    );
  }

  const status = orderingStatus(settings);
  const scheduling = canSchedule(settings);
  const later = scheduling ? " Customers can still book later collection times." : "";
  const statusText = status.open
    ? `Customers can order now. Last ASAP orders at ${status.lastOrders}.`
    : status.reason === "switched_off"
      ? "Customers can browse the menu but can't order."
      : status.reason === "paused"
        ? `ASAP orders are paused until ${status.resumeAt}.${later} Resume from the Orders page.`
        : status.reason === "no_hours"
          ? "Add your opening hours below. Customers can't order until you do."
          : status.next
            ? `Outside opening hours. Next open ${status.next.when} at ${status.next.time}.${later}`
            : `Outside opening hours.${later}`;

  return (
    <div className="space-y-8">
      <section aria-labelledby="accepting-heading" className={`${adminCard} p-6`}>
        <h2 id="accepting-heading" className={adminH2}>
          Online orders
        </h2>
        <div className="mt-5">
          <AcceptingOrdersSwitch enabled={settings.acceptingOrders} large />
        </div>
        <p className="mt-4 text-[17px]" role="status">
          <span className="font-semibold">Right now: </span>
          {statusText}
        </p>
      </section>

      <section aria-labelledby="reset-heading" className={`${adminCard} p-6`}>
        <h2 id="reset-heading" className={adminH2}>
          Sold-out items
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Switch shared ingredients like rice and festival on and off from the Menu page or the kitchen board.
        </p>
        <div className="mt-5">
          <DailyResetSwitch enabled={settings.resetSoldOutDaily} canChange={adminUser.canManageMenus} />
        </div>
      </section>

      <section aria-labelledby="hours-heading" className={`${adminCard} p-6`}>
        <h2 id="hours-heading" className={adminH2}>
          Opening hours
        </h2>
        {adminUser.canManageMenus ? (
          <OpeningHoursForm hours={settings.openingHours} leadMinutes={settings.leadMinutes} />
        ) : (
          <>
            <dl className="mt-5 divide-y divide-hairline border-y border-hairline">
              {openingHoursRows(settings.openingHours).map((row) => (
                <div key={row.day} className="flex justify-between py-3">
                  <dt className="font-semibold">{row.day}</dt>
                  <dd>{row.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[15px] text-muted">Ask the owner to change hours.</p>
          </>
        )}
      </section>

      <section aria-labelledby="collection-heading" className={`${adminCard} p-6`}>
        <h2 id="collection-heading" className={adminH2}>
          Collection times
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Customers choose &ldquo;As soon as possible&rdquo; or a time slot up to {settings.daysAhead} days ahead, within
          opening hours.
        </p>
        {adminUser.canManageMenus ? (
          <CollectionSettingsForm settings={settings} />
        ) : (
          <dl className="mt-5 divide-y divide-hairline border-y border-hairline">
            {[
              ["ASAP time", `${settings.leadMinutes} minutes`],
              ["Slot length", `${settings.slotMinutes} minutes`],
              ["Orders per slot", String(settings.maxOrdersPerSlot)],
              ["Days ahead", String(settings.daysAhead)],
              ["Same-day cut-off", `${settings.sameDayCutoffMinutes} minutes before closing`],
              ["Later times while paused", settings.pauseAllowsScheduled ? "Yes" : "No"],
              ["Ready email", settings.readyEmailEnabled ? "On" : "Off"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="font-semibold">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="qr-heading" className={`${adminCard} p-6`}>
        <h2 id="qr-heading" className={adminH2}>
          QR code
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          For the counter and the window. It opens the order page, and orders placed from it show as QR on the dashboard.
        </p>
        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated artwork behind admin auth */}
          <img
            src="/admin/qr/code.svg"
            alt="QR code with the Flowers Kitchen mark, the words Scan to order, and the web address"
            width={1000}
            height={1220}
            className="h-auto w-full border border-hairline"
          />
          <div>
            <p className="text-[15px]">
              <span className="font-semibold">Opens: </span>
              <span className="break-all">{qrOrderUrl()}</span>
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:max-w-xs">
              <a href="/admin/qr/code.svg?download=1" download className={buttonClasses("primary", "md", "min-h-12")}>
                Download SVG (print)
              </a>
              <a href="/admin/qr/code.png" download className={buttonClasses("secondary", "md", "min-h-12")}>
                Download PNG (3000 px)
              </a>
              <Link href="/admin/qr/card" className={buttonClasses("secondary", "md", "min-h-12")}>
                A6 counter card
              </Link>
            </div>
            <p className="mt-4 text-[15px] text-muted">
              Print at least 3 cm wide. Test it with a phone before printing a batch.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
