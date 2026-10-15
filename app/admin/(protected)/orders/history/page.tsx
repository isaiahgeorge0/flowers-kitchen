import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading, AdminPageHeader, adminCard, adminInput, adminLabel } from "@/components/admin/AdminUi";
import { buttonClasses } from "@/components/Button";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { DURATION_LABELS, formatDuration, orderDurations, type OrderDurations } from "@/lib/admin/kitchen-timings";
import {
  collectionLabel,
  fetchOrderHistory,
  fetchTodayAverages,
  formatPlaced,
  HISTORY_LIST_LIMIT,
  HISTORY_STATUS_LABELS,
  HISTORY_STATUSES,
  historyQuery,
  ORDER_STATUS_LABELS,
  parseHistoryFilters,
  type HistoryFilters,
  type TodayAverages,
} from "@/lib/admin/order-history";
import { formatPence } from "@/lib/ordering/money";
import type { OrderDetail } from "@/lib/ordering/orders";

export const metadata: Metadata = { title: "Order history" };

export default function OrderHistoryPage({ searchParams }: PageProps<"/admin/orders/history">) {
  return (
    <div data-wide>
      <AdminPageHeader eyebrow="Orders" title="Order history">
        Paid online orders by the date they were placed. Read-only.
      </AdminPageHeader>
      <Suspense fallback={<AdminLoading label="Loading orders…" />}>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HistoryContent({ searchParams }: Pick<PageProps<"/admin/orders/history">, "searchParams">) {
  const { supabase, adminUser } = await requireActiveAdmin();
  if (!adminUser.canManageOrders) {
    return (
      <p className={`${adminCard} px-6 py-10 text-center text-muted`}>
        Your account doesn&rsquo;t have access to orders. Ask the owner if you need it.
      </p>
    );
  }

  const filters = parseHistoryFilters(await searchParams);
  const [{ orders, totals, failed }, today] = await Promise.all([
    fetchOrderHistory(supabase, filters),
    fetchTodayAverages(supabase),
  ]);
  const query = historyQuery(filters);

  return (
    <>
      <TodayTimes today={today} />
      <FilterForm filters={filters} />

      {failed || !totals ? (
        <p role="alert" className={`${adminCard} mt-8 px-5 py-4 text-sorrel`}>
          We couldn&rsquo;t load the orders just now. Refresh the page to try again.
        </p>
      ) : (
        <>
          <section aria-label="Totals for these dates" className="mt-8 grid gap-4 sm:grid-cols-4">
            <Total label="Orders" value={String(totals.orders)} />
            <Total label="Paid" value={formatPence(totals.paidPence)} />
            <Total label="Refunds" value={formatPence(totals.refundsPence)} />
            <Total label="Net" value={formatPence(totals.paidPence - totals.refundsPence)} accent />
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-muted" role="status">
              {orders.length === 0
                ? "No orders match."
                : orders.length < totals.orders
                  ? `Showing the newest ${orders.length} of ${totals.orders}. The CSV has them all.`
                  : `${orders.length} ${orders.length === 1 ? "order" : "orders"}.`}
            </p>
            <a href={`/admin/orders/history/export?${query}`} download className={buttonClasses("secondary", "md", "min-h-12")}>
              Export CSV
            </a>
          </div>

          {orders.length > 0 && (
            <>
              <OrderCards orders={orders} />
              <OrderTable orders={orders} />
            </>
          )}
          {orders.length === HISTORY_LIST_LIMIT && (
            <p className="mt-4 text-[15px] text-muted">Narrow the dates or search to see older orders here.</p>
          )}
        </>
      )}

      <p className="mt-10">
        <Link href="/admin/orders" className="inline-flex min-h-11 items-center font-semibold underline decoration-sorrel underline-offset-4">
          Back to the kitchen board
        </Link>
      </p>
    </>
  );
}

const DURATION_KEYS = Object.keys(DURATION_LABELS) as (keyof OrderDurations)[];

function TodayTimes({ today }: { today: TodayAverages | null | undefined }) {
  return (
    <section aria-labelledby="today-times-heading" className="mb-8">
      <h2 id="today-times-heading" className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">
        Today&rsquo;s averages
        {today && (
          <span className="normal-case tracking-normal">
            {" "}
            · {today.orders} collected {today.orders === 1 ? "order" : "orders"}
          </span>
        )}
      </h2>
      {today === undefined ? (
        <p role="alert" className="mt-3 text-sorrel">
          We couldn&rsquo;t load today&rsquo;s times. Refresh to try again.
        </p>
      ) : today === null ? (
        <p className="mt-3 text-muted">No orders collected yet today.</p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          {DURATION_KEYS.map((key) => (
            <Total key={key} label={DURATION_LABELS[key]} value={formatDuration(today.averages[key])} accent={key === "total"} />
          ))}
        </div>
      )}
    </section>
  );
}

function Durations({ order }: { order: OrderDetail }) {
  const durations = orderDurations(order);
  if (!durations) return null;
  return (
    <p className="text-[15px] text-muted tabular-nums">
      {DURATION_KEYS.map((key) => `${DURATION_LABELS[key]} ${formatDuration(durations[key])}`).join(" · ")}
    </p>
  );
}

function FilterForm({ filters }: { filters: HistoryFilters }) {
  return (
    <Form action="/admin/orders/history" className={`${adminCard} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_1fr_auto] lg:items-end`}>
      <div>
        <label htmlFor="history-from" className={adminLabel}>
          From
        </label>
        <input id="history-from" name="from" type="date" defaultValue={filters.from} required className={adminInput} />
      </div>
      <div>
        <label htmlFor="history-to" className={adminLabel}>
          To
        </label>
        <input id="history-to" name="to" type="date" defaultValue={filters.to} required className={adminInput} />
      </div>
      <div>
        <label htmlFor="history-q" className={adminLabel}>
          Order number, name or phone
        </label>
        <input
          id="history-q"
          name="q"
          type="search"
          defaultValue={filters.q}
          maxLength={80}
          autoComplete="off"
          className={adminInput}
        />
      </div>
      <div>
        <label htmlFor="history-status" className={adminLabel}>
          Status
        </label>
        <select id="history-status" name="status" defaultValue={filters.status} className={adminInput}>
          {HISTORY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {HISTORY_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-3">
        <button type="submit" className={buttonClasses("primary", "md", "min-h-12 flex-1")}>
          Apply
        </button>
        <Link href="/admin/orders/history" className={buttonClasses("secondary", "md", "min-h-12")}>
          Reset
        </Link>
      </div>
    </Form>
  );
}

function Total({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`${adminCard} p-5`}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className={`mt-2 font-display text-[36px] font-semibold leading-none tabular-nums ${accent ? "text-sorrel" : ""}`}>
        {value}
      </p>
    </div>
  );
}

const boxCount = (order: OrderDetail) => order.items.reduce((sum, item) => sum + item.quantity, 0);

function StatusText({ order }: { order: OrderDetail }) {
  return (
    <span className={order.orderStatus === "cancelled" ? "font-semibold text-sorrel" : "font-semibold"}>
      {ORDER_STATUS_LABELS[order.orderStatus]}
      {order.refundedPence > 0 && <span className="block font-normal text-muted">Refunded {formatPence(order.refundedPence)}</span>}
    </span>
  );
}

function OrderCards({ orders }: { orders: OrderDetail[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-3 lg:hidden">
      {orders.map((order) => (
        <li key={order.id} className={`${adminCard} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[26px] font-semibold leading-none">#{order.orderNumber}</p>
              <p className="mt-2 font-semibold">{order.customerName}</p>
              <p className="text-[15px] text-muted">{order.customerPhone}</p>
            </div>
            <div className="text-right text-[15px]">
              <p className="font-display text-[22px] font-semibold tabular-nums">{formatPence(order.totalPence)}</p>
              <StatusText order={order} />
            </div>
          </div>
          <p className="mt-3 text-[15px] text-muted">
            Placed {formatPlaced(order.createdAt)} · {boxCount(order)} {boxCount(order) === 1 ? "box" : "boxes"} ·{" "}
            {order.source === "qr" ? "QR" : "Web"}
          </p>
          <p className="text-[15px] text-muted">Collection: {collectionLabel(order)}</p>
          <Durations order={order} />
        </li>
      ))}
    </ul>
  );
}

function OrderTable({ orders }: { orders: OrderDetail[] }) {
  const th = "px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.12em] text-muted";
  const td = "px-4 py-3 align-top";
  return (
    <div className={`${adminCard} mt-4 hidden overflow-x-auto lg:block`}>
      <table className="w-full text-[15px]">
        <caption className="sr-only">Orders</caption>
        <thead className="border-b border-hairline">
          <tr>
            <th scope="col" className={th}>Order</th>
            <th scope="col" className={th}>Placed</th>
            <th scope="col" className={th}>Collection</th>
            <th scope="col" className={th}>Customer</th>
            <th scope="col" className={th}>Boxes</th>
            <th scope="col" className={`${th} text-right`}>Total</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Source</th>
            {DURATION_KEYS.map((key) => (
              <th key={key} scope="col" className={`${th} text-right`}>
                {DURATION_LABELS[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {orders.map((order) => {
            const durations = orderDurations(order);
            return (
              <tr key={order.id}>
                <th scope="row" className={`${td} text-left font-display text-[20px] font-semibold`}>
                  #{order.orderNumber}
                </th>
                <td className={`${td} whitespace-nowrap`}>{formatPlaced(order.createdAt)}</td>
                <td className={td}>{collectionLabel(order)}</td>
                <td className={td}>
                  <span className="block font-semibold">{order.customerName}</span>
                  <span className="block text-muted">{order.customerPhone}</span>
                </td>
                <td className={td}>{boxCount(order)}</td>
                <td className={`${td} text-right tabular-nums`}>{formatPence(order.totalPence)}</td>
                <td className={td}>
                  <StatusText order={order} />
                </td>
                <td className={td}>{order.source === "qr" ? "QR" : "Web"}</td>
                {DURATION_KEYS.map((key) => (
                  <td key={key} className={`${td} whitespace-nowrap text-right tabular-nums`}>
                    {durations ? (
                      formatDuration(durations[key])
                    ) : (
                      <>
                        <span aria-hidden>–</span>
                        <span className="sr-only">Not collected</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
