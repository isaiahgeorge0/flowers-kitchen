"use client";

import { useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { cancelOrderAction, moveOrderAction, resendReceiptAction } from "@/app/admin/(protected)/orders/actions";
import { AcceptingOrdersSwitch } from "@/components/admin/AcceptingOrdersSwitch";
import { AdminMenu, type AdminMenuProps } from "@/components/admin/AdminMenu";
import { EmailNotSentChip } from "@/components/admin/AdminUi";
import { PauseControls } from "@/components/admin/PauseControls";
import { buttonClasses } from "@/components/Button";
import { Sheet, SheetClose } from "@/components/order/Sheet";
import { CANCEL_REASONS, type CancelReason } from "@/lib/admin/cancel-reasons";
import { emailOverdue } from "@/lib/admin/email-status";
import type { SharedPanelData } from "@/lib/admin/shared-items";
import {
  CARD_STATE_LABELS,
  cardState,
  columnEnteredAt,
  finishedAt,
  formatMinutes,
  formatTimer,
  joinedBoardAt,
  wholeMinutes,
  type CardState,
} from "@/lib/admin/kitchen-timings";
import { UPCOMING_WINDOW_MINUTES } from "@/lib/ordering/limits";
import { formatPence } from "@/lib/ordering/money";
import { formatClock, type OrderDetail, type OrderStatus } from "@/lib/ordering/orders";
import { formatCollectionTime, zonedIsoDate } from "@/lib/ordering/schedule";
import { kitchenSidesNote } from "@/lib/ordering/sides";
import { KitchenBar } from "./KitchenBar";
import { RunningLow } from "./RunningLow";
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

const TICK_MS = 30_000;
const subscribeTick = (listener: () => void) => {
  const id = window.setInterval(listener, TICK_MS);
  return () => window.clearInterval(id);
};
const getTick = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

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
  menu,
  shared,
}: {
  orders: OrderDetail[];
  failed: boolean;
  settings: BoardSettings;
  serverNow: number;
  menu: AdminMenuProps;
  /** Null when the kitchen account can't load the shared ingredient switches. */
  shared: SharedPanelData | null;
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

  const toggleSound = () => void alerts.toggleSound();

  // Live and Sound sit in the top bar below 1440px and beside the switches above it; only one
  // copy is ever displayed.
  return (
    <div className="@container" data-kitchen>
      <KitchenBar>
        <LiveStatus state={realtime.state} updating={realtime.updating} compact />
        {shared && <RunningLow data={shared} compact />}
        <SoundToggle on={alerts.soundOn} onToggle={toggleSound} compact />
        <AdminMenu {...menu} tone="light" layout="drawer" />
      </KitchenBar>
      <div className="grid gap-3 @3xl:grid-cols-[auto_1fr] @3xl:items-start min-[1440px]:grid-cols-[1fr_1fr_auto]">
        <AcceptingOrdersSwitch enabled={settings.acceptingOrders} />
        <PauseControls
          pausedUntil={settings.pausedUntil}
          acceptingOrders={settings.acceptingOrders}
          pauseAllowsScheduled={settings.pauseAllowsScheduled}
        />
        <div className="hidden flex-wrap items-center gap-3 min-[1440px]:flex">
          <LiveStatus state={realtime.state} updating={realtime.updating} />
          {shared && <RunningLow data={shared} />}
          <SoundToggle on={alerts.soundOn} onToggle={toggleSound} />
        </div>
      </div>
      {alerts.soundError && (
        <p role="alert" className="mt-3 text-[15px] font-semibold text-sorrel">
          {alerts.soundError}
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-4 rounded-card border border-sorrel bg-paper px-4 py-3 font-semibold text-sorrel">
          We couldn&rsquo;t load the orders. Check the connection; the board retries every minute.
        </p>
      )}

      <UpcomingList orders={upcoming} now={now} onCancel={setCancelling} />

      <div role="tablist" aria-label="Order columns" className="mt-6 grid grid-cols-4 gap-1 lg:hidden">
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
              className={`flex min-h-16 flex-col items-center justify-center rounded-card border px-1 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors duration-300 ease-out ${
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

      <div className="mt-6 grid gap-6 lg:grid-cols-4 lg:gap-3">
        {COLUMNS.map((column) => (
          <section
            key={column.id}
            id={`column-${column.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${column.id}`}
            className={`${selected === column.id ? "block" : "hidden"} lg:block`}
          >
            <h2 className="hidden items-baseline justify-between border-b border-hairline pb-3 lg:flex">
              <span className="text-[15px] font-semibold uppercase tracking-[0.12em]">{column.label}</span>
              <span className="font-display text-[28px] font-semibold leading-none">{byColumn[column.id].length}</span>
            </h2>
            {byColumn[column.id].length === 0 ? (
              <p className="py-10 text-center text-muted">{column.empty}</p>
            ) : (
              <ul className="space-y-4 lg:mt-4">
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
    <details className="group mt-6 rounded-card border border-hairline bg-paper" data-upcoming>
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

function LiveStatus({ state, updating, compact = false }: { state: RealtimeState; updating: boolean; compact?: boolean }) {
  const label = {
    connecting: "Connecting…",
    live: updating ? "Updating…" : "Live",
    reconnecting: "Reconnecting…",
    offline: "Offline",
  }[state];
  const dot = { connecting: "bg-allspice", live: "bg-mountain", reconnecting: "bg-allspice", offline: "bg-sorrel" }[state];
  return (
    <div
      role="status"
      className={`flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold ${compact ? "min-h-11" : "min-h-14 px-1"}`}
    >
      <span aria-hidden className={`size-3 shrink-0 rounded-pill ${dot}`} />
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

function SoundToggle({ on, onToggle, compact = false }: { on: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={buttonClasses(
        on ? "primary" : "secondary",
        "md",
        compact ? "shrink-0 gap-2 max-sm:w-11 max-sm:px-0" : "min-h-14 gap-3",
      )}
    >
      <SoundIcon on={on} />
      <span className={compact ? "max-sm:sr-only" : ""}>{on ? "Sound on" : "Sound off"}</span>
    </button>
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

const STATE_CARD: Record<CardState, string> = {
  normal: "",
  slow: "border-l-4 border-l-allspice",
  start: "border-l-4 border-l-allspice",
  overdue: "border-l-4 border-l-sorrel",
  late: "border-l-4 border-l-sorrel",
};

const AMBER_PILL = "bg-allspice text-pimento";
const SORREL_PILL = "bg-sorrel text-cream";
const STATE_PILL: Record<Exclude<CardState, "normal">, string> = {
  slow: AMBER_PILL,
  start: AMBER_PILL,
  overdue: SORREL_PILL,
  late: SORREL_PILL,
};

/** "Due 18:30" (with the day if it isn't today) or "ASAP · Ready 17:35", in parts that may wrap between. */
function collectionLine(order: OrderDetail, now: number): string[] {
  if (!order.scheduledFor) {
    return order.estimatedReadyAt ? ["ASAP ·", `Ready ${formatClock(order.estimatedReadyAt)}`] : ["ASAP"];
  }
  const [day, time] = formatCollectionTime(order.scheduledFor, undefined, new Date(now)).split(", ");
  return day === "Today" ? [`Due ${time}`] : ["Due", day, time];
}

/** One pill (Just in / Slow / Overdue / Start now / Late) and the time in the current column. */
function StatusLine({
  order,
  now,
  state,
  lateMinutes,
  justIn,
}: {
  order: OrderDetail;
  now: number;
  state: CardState;
  lateMinutes: number;
  justIn: boolean;
}) {
  const inColumn = wholeMinutes(now - columnEnteredAt(order));
  const pill =
    state === "late"
      ? { label: `Late ${formatMinutes(lateMinutes)}`, className: STATE_PILL.late }
      : state !== "normal"
        ? { label: CARD_STATE_LABELS[state], className: STATE_PILL[state] }
        : justIn
          ? { label: "Just in", className: SORREL_PILL }
          : null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap tabular-nums">
      {pill && (
        <span className={`rounded-pill px-2 py-0.5 text-[13px] font-semibold uppercase tracking-[0.08em] ${pill.className}`}>
          {pill.label}
        </span>
      )}
      <span className={`text-[17px] font-semibold ${state === "overdue" || state === "late" ? "text-sorrel" : ""}`}>
        <span className="sr-only">In this column: </span>
        {formatTimer(inColumn)}
      </span>
    </p>
  );
}

const totalLabel = (order: OrderDetail, now: number) =>
  `Total ${formatTimer(wholeMinutes((finishedAt(order) ?? now) - joinedBoardAt(order)))}`;

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
  const onBoard = active && !upcoming;
  const { state, lateMinutes } = onBoard ? cardState(order, now) : { state: "normal" as const, lateMinutes: 0 };
  const justIn = highlighted && onBoard && state === "normal";
  const next = NEXT[order.orderStatus];
  const back = BACK[order.orderStatus];
  const boxes = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const [resent, setResent] = useState(false);
  const emailLate =
    order.paymentStatus === "paid" &&
    order.confirmationEmailSentAt !== undefined &&
    emailOverdue(order.confirmationEmailSentAt, order.paymentConfirmedAt ?? order.createdAt, now);

  const move = (to: OrderStatus) => {
    setError(null);
    startTransition(async () => {
      const result = await moveOrderAction(order.id, order.orderStatus, to);
      if (!result.ok) setError(result.message);
    });
  };

  const resendReceipt = () => {
    setError(null);
    startTransition(async () => {
      const result = await resendReceiptAction(order.id);
      if (result.ok) setResent(true);
      else setError(result.message);
    });
  };

  return (
    <article
      aria-labelledby={`order-${order.id}`}
      aria-busy={pending}
      className={`rounded-card border border-hairline bg-paper p-4 transition-opacity duration-300 ease-out ${STATE_CARD[state]} ${
        justIn ? "outline-2 outline-offset-2 outline-sorrel" : ""
      } ${pending ? "opacity-60" : ""} ${active ? "" : "bg-cream"} ${upcoming ? "bg-cream" : ""}`}
    >
      <header>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h3 id={`order-${order.id}`} className="whitespace-nowrap font-display text-[32px] font-semibold leading-none tabular-nums">
            #{order.orderNumber}
          </h3>
          {onBoard && (
            <StatusLine order={order} now={now} state={state} lateMinutes={lateMinutes} justIn={justIn} />
          )}
        </div>
        <p className="mt-2 break-words text-[17px] font-semibold">{order.customerName}</p>
        {active && (
          <p className="mt-0.5 text-[15px] text-muted tabular-nums">
            {collectionLine(order, now).map((part, i) => (
              <span key={part}>
                {i > 0 && " "}
                <span className="whitespace-nowrap">{part}</span>
              </span>
            ))}
          </p>
        )}
      </header>

      {order.slotOverCapacity && active && (
        <p className="mt-3 inline-block rounded-pill border border-sorrel px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-sorrel">
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
              {item.missingSides.length > 0 && (
                <span className="block text-[15px] font-semibold text-sorrel" data-missing-sides>
                  {kitchenSidesNote(item.missingSides)}
                </span>
              )}
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
        <span className="tabular-nums">
          <span className="whitespace-nowrap">
            {boxes} {boxes === 1 ? "box" : "boxes"} · {formatPence(order.totalPence)}
          </span>
          {onBoard && (
            <>
              {" "}
              <span className="whitespace-nowrap">· {totalLabel(order, now)}</span>
            </>
          )}
        </span>
        <a href={`tel:${order.customerPhone}`} className="inline-flex min-h-11 items-center font-semibold text-pimento underline underline-offset-4">
          {order.customerPhone}
        </a>
      </p>

      {emailLate && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EmailNotSentChip />
          <button
            type="button"
            disabled={pending}
            onClick={resendReceipt}
            className={buttonClasses("secondary", "md", "px-4")}
          >
            Resend receipt
          </button>
        </div>
      )}
      {resent && !emailLate && (
        <p role="status" className="mt-3 text-[15px] font-semibold text-mountain">
          Receipt sent.
        </p>
      )}

      {!active && <DoneLine order={order} now={now} />}

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
          <div className="flex flex-wrap items-center gap-2">
            {upcoming && next && (
              <button
                type="button"
                disabled={pending}
                onClick={() => move(next.to)}
                className={buttonClasses("secondary", "md", "min-h-14 flex-1 whitespace-nowrap px-3")}
              >
                Start early
              </button>
            )}
            {back && (
              <button
                type="button"
                disabled={pending}
                onClick={() => move(back.to)}
                className={buttonClasses("secondary", "md", "min-h-14 flex-1 whitespace-nowrap px-3")}
              >
                {back.label}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={onCancel}
              className="ml-auto min-h-14 whitespace-nowrap rounded-pill px-3 text-[15px] font-semibold uppercase tracking-[0.08em] text-sorrel decoration-1 underline-offset-[6px] hover:underline disabled:cursor-not-allowed disabled:opacity-75"
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

/** "Collected 18:24 · Total 21 min", or the cancellation with refund and reason. */
function DoneLine({ order, now }: { order: OrderDetail; now: number }) {
  const total = (
    <>
      {" "}
      <span className="whitespace-nowrap">· {totalLabel(order, now)}</span>
    </>
  );
  if (order.orderStatus === "completed") {
    return (
      <p className="mt-2 text-[15px] font-semibold text-mountain tabular-nums">
        <span className="whitespace-nowrap">Collected{order.completedAt ? ` ${formatClock(order.completedAt)}` : ""}</span>
        {total}
      </p>
    );
  }
  return (
    <p className="mt-2 text-[15px] font-semibold text-sorrel tabular-nums">
      <span className="whitespace-nowrap">Cancelled{order.cancelledAt ? ` ${formatClock(order.cancelledAt)}` : ""}</span>
      {order.paymentStatus === "refunded" ? " · Refunded" : ""}
      {total}
      {order.cancelReason ? ` · ${order.cancelReason}` : ""}
    </p>
  );
}

function CancelDialog({ order, onClose }: { order: OrderDetail | null; onClose: () => void }) {
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [details, setDetails] = useState("");
  const [emailFailed, setEmailFailed] = useState(false);
  const detailsRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setError(null);
    setReason(null);
    setDetails("");
    setEmailFailed(false);
  };

  const close = () => {
    if (pending) return;
    reset();
    onClose();
  };

  const pick = (value: CancelReason) => {
    const next = reason === value ? null : value;
    setReason(next);
    if (next === "Other") detailsRef.current?.focus();
  };

  const confirm = () => {
    if (!order) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelOrderAction(order.id, reason, details);
      if (!result.ok) {
        setError(result.message);
      } else if (!result.emailed) {
        setEmailFailed(true);
      } else {
        reset();
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
              <p id={`${titleId}-reason`} className="mt-5 text-[15px] font-semibold">
                Reason <span className="font-normal text-muted">(optional, for the kitchen only)</span>
              </p>
              <div role="group" aria-labelledby={`${titleId}-reason`} className="mt-2 flex flex-wrap gap-2">
                {CANCEL_REASONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={reason === value}
                    onClick={() => pick(value)}
                    disabled={pending}
                    className={`min-h-11 rounded-pill border px-4 text-[15px] font-semibold transition-colors duration-300 ease-out ${
                      reason === value ? "border-pimento bg-pimento text-cream" : "border-hairline bg-cream text-pimento hover:border-pimento"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <label htmlFor={`${titleId}-details`} className="mt-4 block text-[15px] font-semibold">
                Details <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id={`${titleId}-details`}
                ref={detailsRef}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={180}
                placeholder={reason === "Out of stock" ? "For example: curry goat" : "Anything the kitchen should know"}
                className="mt-2 block min-h-12 w-full rounded-input border border-hairline bg-cream px-4 py-2.5 text-[17px]"
              />
              {error && (
                <p role="alert" className="mt-4 rounded-card border border-sorrel bg-cream px-4 py-3 text-[15px] font-semibold text-sorrel">
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
