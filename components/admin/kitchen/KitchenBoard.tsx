"use client";

import { useId, useState, useSyncExternalStore, useTransition } from "react";
import { cancelOrderAction, moveOrderAction } from "@/app/admin/(protected)/orders/actions";
import { AcceptingOrdersSwitch } from "@/components/admin/AcceptingOrdersSwitch";
import { PauseControls } from "@/components/admin/PauseControls";
import { buttonClasses } from "@/components/Button";
import { Sheet, SheetClose } from "@/components/order/Sheet";
import { urgencyFor, type Urgency } from "@/lib/admin/kitchen-alerts";
import { UPCOMING_WINDOW_MINUTES } from "@/lib/ordering/limits";
import { formatPence } from "@/lib/ordering/money";
import { formatClock, type OrderDetail, type OrderStatus } from "@/lib/ordering/orders";
import { formatCollectionTime, zonedIsoDate } from "@/lib/ordering/schedule";
import { useNewOrderAlerts } from "./useNewOrderAlerts";
import { useRealtimeRefresh, type RealtimeState } from "./useRealtimeRefresh";

type ColumnId = "confirmed" | "preparing" | "ready_for_collection" | "done";

const COLUMNS: { id: ColumnId; label: string; empty: string }[] = [
  { id: "confirmed", label: "New", empty: "No new orders." },
  { id: "preparing", label: "Preparing", empty: "Nothing on the go." },
  { id: "ready_for_collection", label: "Ready", empty: "Nothing waiting for collection." },
  { id: "done", label: "Collected", empty: "Nothing collected yet today." },
];

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  confirmed: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready_for_collection", label: "Mark ready" },
  ready_for_collection: { to: "completed", label: "Collected" },
};
const BACK: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  preparing: { to: "confirmed", label: "Back to New" },
  ready_for_collection: { to: "preparing", label: "Back to Preparing" },
};

const columnOf = (order: OrderDetail): ColumnId =>
  order.orderStatus === "confirmed" || order.orderStatus === "preparing" || order.orderStatus === "ready_for_collection"
    ? order.orderStatus
    : "done";

const UPCOMING_MS = UPCOMING_WINDOW_MINUTES * 60_000;

/** Scheduled orders stay out of New until 30 minutes before collection. */
const isUpcoming = (order: OrderDetail, now: number) =>
  order.orderStatus === "confirmed" && order.scheduledFor !== null && Date.parse(order.scheduledFor) - now > UPCOMING_MS;

/** When the customer is due: the booked slot, or the ASAP estimate. */
const dueAt = (order: OrderDetail) =>
  Date.parse(order.scheduledFor ?? order.estimatedReadyAt ?? order.confirmedAt ?? order.createdAt);

const TICK_MS = 15_000;
const subscribeTick = (listener: () => void) => {
  const id = window.setInterval(listener, TICK_MS);
  return () => window.clearInterval(id);
};
const getTick = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

function phaseStart(order: OrderDetail) {
  if (order.orderStatus === "preparing") return order.preparedAt;
  if (order.orderStatus === "ready_for_collection") return order.readyAt;
  const confirmed = order.confirmedAt ?? order.paymentConfirmedAt ?? order.createdAt;
  // A scheduled order's clock starts when it joins New, not when it was paid days ago.
  if (order.scheduledFor) {
    return new Date(Math.max(Date.parse(order.scheduledFor) - UPCOMING_MS, Date.parse(confirmed))).toISOString();
  }
  return confirmed;
}

function formatMinutes(minutes: number) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

export type BoardSettings = {
  acceptingOrders: boolean;
  pausedUntil: string | null;
  pauseAllowsScheduled: boolean;
};

export function KitchenBoard({
  orders,
  failed,
  settings,
  serverNow,
}: {
  orders: OrderDetail[];
  failed: boolean;
  settings: BoardSettings;
  serverNow: number;
}) {
  const realtime = useRealtimeRefresh();
  const now = useSyncExternalStore(subscribeTick, getTick, () => null) ?? serverNow;
  const upcoming = orders.filter((order) => isUpcoming(order, now)).sort((a, b) => dueAt(a) - dueAt(b));
  const onBoard = orders.filter((order) => !isUpcoming(order, now));
  const newIds = onBoard.filter((order) => order.orderStatus === "confirmed").map((order) => order.id);
  const alerts = useNewOrderAlerts(newIds);
  const [selected, setSelected] = useState<ColumnId>("confirmed");
  const [cancelling, setCancelling] = useState<OrderDetail | null>(null);

  const byColumn = Object.fromEntries(COLUMNS.map((column) => [column.id, [] as OrderDetail[]])) as Record<
    ColumnId,
    OrderDetail[]
  >;
  for (const order of onBoard) byColumn[columnOf(order)].push(order);
  byColumn.confirmed.sort((a, b) => dueAt(a) - dueAt(b));

  return (
    <div className="@container">
      <div className="grid gap-3 @3xl:grid-cols-[1fr_1fr_auto] @3xl:items-start">
        <AcceptingOrdersSwitch enabled={settings.acceptingOrders} />
        <PauseControls
          pausedUntil={settings.pausedUntil}
          acceptingOrders={settings.acceptingOrders}
          pauseAllowsScheduled={settings.pauseAllowsScheduled}
        />
        <div className="flex flex-wrap items-center gap-3">
          <LiveStatus state={realtime.state} updating={realtime.updating} />
          <button
            type="button"
            aria-pressed={alerts.soundOn}
            onClick={() => void alerts.toggleSound()}
            className={buttonClasses(alerts.soundOn ? "primary" : "secondary", "md", "min-h-14 gap-3")}
          >
            <SoundIcon on={alerts.soundOn} />
            {alerts.soundOn ? "Sound on" : "Sound off"}
          </button>
        </div>
      </div>
      {alerts.soundError && (
        <p role="alert" className="mt-3 text-[15px] font-semibold text-sorrel">
          {alerts.soundError}
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-4 rounded-sm border border-sorrel bg-paper px-4 py-3 font-semibold text-sorrel">
          We couldn&rsquo;t load the orders. Check the connection; the board retries every minute.
        </p>
      )}

      <UpcomingList orders={upcoming} now={now} onCancel={setCancelling} />

      <div role="tablist" aria-label="Order columns" className="mt-6 grid grid-cols-4 gap-1 @5xl:hidden">
        {COLUMNS.map((column) => {
          const active = selected === column.id;
          return (
            <button
              key={column.id}
              type="button"
              role="tab"
              id={`tab-${column.id}`}
              aria-selected={active}
              aria-controls={`column-${column.id}`}
              onClick={() => setSelected(column.id)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-sm border px-1 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors duration-300 ease-out ${
                active ? "border-pimento bg-pimento text-cream" : "border-hairline bg-paper text-pimento"
              }`}
            >
              <span className="font-display text-[24px] normal-case leading-none tracking-normal">
                {byColumn[column.id].length}
              </span>
              <span className="mt-1">{column.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 @5xl:grid-cols-4 @5xl:gap-4">
        {COLUMNS.map((column) => (
          <section
            key={column.id}
            id={`column-${column.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${column.id}`}
            className={`${selected === column.id ? "block" : "hidden"} @5xl:block`}
          >
            <h2 className="hidden items-baseline justify-between border-b border-hairline pb-3 @5xl:flex">
              <span className="text-[15px] font-semibold uppercase tracking-[0.12em]">{column.label}</span>
              <span className="font-display text-[28px] font-semibold leading-none">{byColumn[column.id].length}</span>
            </h2>
            {byColumn[column.id].length === 0 ? (
              <p className="py-10 text-center text-muted">{column.empty}</p>
            ) : (
              <ul className="space-y-4 @5xl:mt-4">
                {byColumn[column.id].map((order) => (
                  <li key={order.id}>
                    <OrderCard
                      order={order}
                      now={now}
                      highlighted={alerts.highlighted.has(order.id)}
                      onCancel={() => setCancelling(order)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <CancelDialog order={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}

function UpcomingList({
  orders,
  now,
  onCancel,
}: {
  orders: OrderDetail[];
  now: number;
  onCancel: (order: OrderDetail) => void;
}) {
  const groups = new Map<string, OrderDetail[]>();
  for (const order of orders) {
    const day = zonedIsoDate(order.scheduledFor!);
    groups.set(day, [...(groups.get(day) ?? []), order]);
  }
  const today = zonedIsoDate(now);
  const todayCount = groups.get(today)?.length ?? 0;
  const next = orders[0]?.scheduledFor;

  return (
    <details className="group mt-6 rounded-sm border border-hairline bg-paper" data-upcoming>
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[15px] font-semibold uppercase tracking-[0.12em]">
            Upcoming <span className="font-display text-[24px] normal-case tracking-normal">{orders.length}</span>
          </span>
          <span className="block text-[15px] text-muted">
            {orders.length === 0
              ? "No orders booked for later."
              : `${todayCount} later today · next ${formatCollectionTime(next!, undefined, new Date(now))}. Each moves to New ${UPCOMING_WINDOW_MINUTES} minutes before collection.`}
          </span>
        </span>
        <span aria-hidden className="text-[24px] leading-none transition-transform duration-300 ease-out group-open:rotate-45">
          +
        </span>
      </summary>
      {orders.length > 0 && (
        <div className="space-y-6 border-t border-hairline px-4 py-4">
          {[...groups].map(([day, dayOrders]) => (
            <section key={day} aria-label={dayHeading(day, today)}>
              <h3 className="flex items-baseline justify-between border-b border-hairline pb-2">
                <span className="font-display text-[22px] font-semibold">{dayHeading(day, today)}</span>
                <span className="text-[15px] text-muted">
                  {dayOrders.length} {dayOrders.length === 1 ? "order" : "orders"}
                </span>
              </h3>
              <ul className="mt-3 grid gap-3 @3xl:grid-cols-2 @6xl:grid-cols-3">
                {dayOrders.map((order) => (
                  <li key={order.id}>
                    <OrderCard order={order} now={now} highlighted={false} upcoming onCancel={() => onCancel(order)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </details>
  );
}

function dayHeading(day: string, today: string) {
  if (day === today) return "Later today";
  const label = formatCollectionTime(`${day}T12:00:00Z`, "UTC", new Date(`${today}T12:00:00Z`));
  return label.split(",")[0];
}

function LiveStatus({ state, updating }: { state: RealtimeState; updating: boolean }) {
  const label = {
    connecting: "Connecting…",
    live: updating ? "Updating…" : "Live",
    reconnecting: "Reconnecting…",
    offline: "Offline",
  }[state];
  const dot = { connecting: "bg-allspice", live: "bg-mountain", reconnecting: "bg-allspice", offline: "bg-sorrel" }[state];
  return (
    <div role="status" className="flex min-h-14 items-center gap-2 px-1 text-[15px] font-semibold">
      <span aria-hidden className={`size-3 rounded-full ${dot}`} />
      {label}
      {state === "offline" && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-1 min-h-11 px-2 underline underline-offset-4"
        >
          Reload
        </button>
      )}
    </div>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      {on ? <path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /> : <path d="M17 9l5 6M22 9l-5 6" />}
    </svg>
  );
}

const URGENCY_CARD: Record<Urgency, string> = {
  normal: "",
  attention: "border-l-4 border-l-allspice",
  urgent: "border-l-4 border-l-sorrel",
};

function CollectionTime({ order, now }: { order: OrderDetail; now: number }) {
  if (!order.scheduledFor) {
    return (
      <p className="leading-tight">
        <span className="block font-display text-[26px] font-semibold leading-none">ASAP</span>
        {order.estimatedReadyAt && (
          <span className="mt-1 block text-[15px] text-muted">Ready {formatClock(order.estimatedReadyAt)}</span>
        )}
      </p>
    );
  }
  const label = formatCollectionTime(order.scheduledFor, undefined, new Date(now));
  const [day, time] = label.split(", ");
  return (
    <p className="leading-tight">
      <span className="block font-display text-[26px] font-semibold leading-none tabular-nums">{time}</span>
      <span className="mt-1 block text-[15px] text-muted">{day === "Today" ? "Collect today" : `Collect ${day}`}</span>
    </p>
  );
}

function OrderCard({
  order,
  now,
  highlighted,
  upcoming = false,
  onCancel,
}: {
  order: OrderDetail;
  now: number;
  highlighted: boolean;
  upcoming?: boolean;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = columnOf(order) !== "done";
  const justIn = highlighted && active;
  const start = phaseStart(order);
  const minutes = !upcoming && start ? Math.max(0, Math.floor((now - Date.parse(start)) / 60_000)) : null;
  const urgency = active && minutes !== null ? urgencyFor(order.orderStatus, minutes) : "normal";
  const next = NEXT[order.orderStatus];
  const back = BACK[order.orderStatus];
  const boxes = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const move = (to: OrderStatus) => {
    setError(null);
    startTransition(async () => {
      const result = await moveOrderAction(order.id, order.orderStatus, to);
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <article
      aria-labelledby={`order-${order.id}`}
      aria-busy={pending}
      className={`rounded-sm border border-hairline bg-paper p-4 transition-opacity duration-300 ease-out ${URGENCY_CARD[urgency]} ${
        justIn ? "outline-2 outline-offset-2 outline-sorrel" : ""
      } ${pending ? "opacity-60" : ""} ${active ? "" : "bg-cream"} ${upcoming ? "bg-cream" : ""}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 id={`order-${order.id}`} className="font-display text-[32px] font-semibold leading-none">
            #{order.orderNumber}
          </h3>
          <p className="mt-2 text-[17px] font-semibold">{order.customerName}</p>
        </div>
        <div className="text-right">
          {justIn && (
            <span className="mb-1 inline-block whitespace-nowrap rounded-sm bg-sorrel px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-cream">
              Just in
            </span>
          )}
          {active && <CollectionTime order={order} now={now} />}
          {active && minutes !== null && (
            <p className={`mt-1 text-[15px] font-semibold ${urgency === "urgent" ? "text-sorrel" : "text-muted"}`}>
              {formatMinutes(minutes)}
            </p>
          )}
        </div>
      </header>

      {order.slotOverCapacity && active && (
        <p className="mt-3 inline-block rounded-sm border border-sorrel px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-sorrel">
          Over slot capacity
        </p>
      )}

      <ul className="mt-4 space-y-2 border-t border-hairline pt-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3 text-[17px] leading-snug">
            <span className="min-w-8 font-display text-[20px] font-semibold">{item.quantity}×</span>
            <span>
              <span className="font-semibold">{item.name}</span>
              {item.options.length > 0 && <span className="block text-[15px] text-muted">{item.options.join(", ")}</span>}
            </span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-4 border-l-4 border-sorrel bg-cream px-3 py-2 text-[16px]">
          <span className="font-semibold">Note: </span>
          {order.note}
        </p>
      )}

      <p className="mt-4 flex flex-wrap justify-between gap-x-3 text-[15px] text-muted">
        <span>
          {boxes} {boxes === 1 ? "box" : "boxes"} · {formatPence(order.totalPence)}
        </span>
        <a href={`tel:${order.customerPhone}`} className="inline-flex min-h-11 items-center font-semibold text-pimento underline underline-offset-4">
          {order.customerPhone}
        </a>
      </p>

      {!active && <DoneLine order={order} />}

      {active && (
        <div className="mt-3 space-y-2">
          {next && !upcoming && (
            <button
              type="button"
              disabled={pending}
              onClick={() => move(next.to)}
              className={buttonClasses("primary", "md", "min-h-16 w-full text-[16px]")}
            >
              {next.label}
            </button>
          )}
          <div className="flex gap-2">
            {upcoming && next && (
              <button
                type="button"
                disabled={pending}
                onClick={() => move(next.to)}
                className={buttonClasses("secondary", "md", "min-h-14 flex-1 px-3")}
              >
                Start early
              </button>
            )}
            {back && (
              <button
                type="button"
                disabled={pending}
                onClick={() => move(back.to)}
                className={buttonClasses("secondary", "md", "min-h-14 flex-1 px-3")}
              >
                {back.label}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={onCancel}
              className="min-h-14 flex-1 rounded-sm border border-hairline px-3 text-[15px] font-semibold uppercase tracking-[0.08em] text-sorrel transition-colors duration-300 ease-out hover:border-sorrel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[15px] font-semibold text-sorrel">
          {error}
        </p>
      )}
    </article>
  );
}

function DoneLine({ order }: { order: OrderDetail }) {
  if (order.orderStatus === "completed") {
    return (
      <p className="mt-2 text-[15px] font-semibold text-mountain">
        Collected{order.completedAt ? ` at ${formatClock(order.completedAt)}` : ""}
      </p>
    );
  }
  return (
    <p className="mt-2 text-[15px] font-semibold text-sorrel">
      Cancelled{order.cancelledAt ? ` at ${formatClock(order.cancelledAt)}` : ""}
      {order.paymentStatus === "refunded" ? " · Refunded" : ""}
      {order.cancelReason ? ` · ${order.cancelReason}` : ""}
    </p>
  );
}

function CancelDialog({ order, onClose }: { order: OrderDetail | null; onClose: () => void }) {
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [emailFailed, setEmailFailed] = useState(false);

  const close = () => {
    if (pending) return;
    setError(null);
    setReason("");
    setEmailFailed(false);
    onClose();
  };

  const confirm = () => {
    if (!order) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelOrderAction(order.id, reason);
      if (!result.ok) {
        setError(result.message);
      } else if (!result.emailed) {
        setEmailFailed(true);
      } else {
        setReason("");
        onClose();
      }
    });
  };

  const phone = order && (
    <a href={`tel:${order.customerPhone}`} className="font-semibold underline underline-offset-4">
      {order.customerPhone}
    </a>
  );

  return (
    <Sheet open={order !== null} onClose={close} labelledBy={titleId}>
      {order && (
        <div className="overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-display text-[28px] font-semibold leading-tight">
              {emailFailed ? `Order #${order.orderNumber} cancelled` : `Cancel order #${order.orderNumber}?`}
            </h2>
            <SheetClose onClick={close} />
          </div>
          {emailFailed ? (
            <>
              <p role="alert" className="mt-3 text-[17px]">
                The refund went through, but the cancellation email didn&rsquo;t send. Please give {order.customerName} a
                ring on {phone} to let them know.
              </p>
              <button type="button" onClick={close} className={buttonClasses("primary", "md", "mt-6 min-h-14 w-full")}>
                Done
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-[17px]">
                We&rsquo;ll refund <strong>{formatPence(order.totalPence)}</strong> to {order.customerName}&rsquo;s card
                through Stripe and email them to say it&rsquo;s cancelled. This can&rsquo;t be undone.
              </p>
              <p className="mt-2 text-[15px] text-muted">Optional: give them a ring on {phone} as well.</p>
              <label htmlFor={`${titleId}-reason`} className="mt-5 block text-[15px] font-semibold">
                Reason (optional, for the kitchen only)
              </label>
              <input
                id={`${titleId}-reason`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={200}
                placeholder="For example: sold out of curry goat"
                className="mt-2 block min-h-12 w-full rounded-sm border border-hairline bg-cream px-4 py-2.5 text-[17px]"
              />
              {error && (
                <p role="alert" className="mt-4 rounded-sm border border-sorrel bg-cream px-4 py-3 text-[15px] font-semibold text-sorrel">
                  {error}
                </p>
              )}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={close} disabled={pending} className={buttonClasses("secondary", "md", "min-h-14")}>
                  Keep order
                </button>
                <button type="button" onClick={confirm} disabled={pending} aria-busy={pending} className={buttonClasses("primary", "md", "min-h-14")}>
                  {pending ? "Refunding…" : "Cancel and refund"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
