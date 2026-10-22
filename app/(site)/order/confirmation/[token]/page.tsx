import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buttonClasses } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { ClearBasket, PaymentStatusPoller } from "@/components/order/PaymentStatus";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { COLLECTION_ADDRESS } from "@/lib/ordering/limits";
import { formatPence } from "@/lib/ordering/money";
import { formatClock, readOrder, type OrderDetail } from "@/lib/ordering/orders";
import { formatCollectionLong } from "@/lib/ordering/schedule";
import { orderHeadsUp } from "@/lib/ordering/sides";
import { supabase } from "@/lib/supabase-server";
import { h1, h3 } from "@/lib/typography";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ConfirmationPage({ params }: PageProps<"/order/confirmation/[token]">) {
  return (
    <Section reveal={false} first>
      <Suspense fallback={<p className="text-lg text-muted">Loading your order…</p>}>
        <Confirmation params={params} />
      </Suspense>
    </Section>
  );
}

const kitchenLine: Partial<Record<OrderDetail["orderStatus"], string>> = {
  confirmed: "We've got your order and we're on it.",
  preparing: "We're cooking your order now.",
  ready_for_collection: "Your order is ready to collect.",
  completed: "Collected. Enjoy your food.",
};

async function Confirmation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await connection();
  if (!UUID_RE.test(token)) notFound();

  let order: OrderDetail | null;
  try {
    order = await readOrder(supabase, { token });
  } catch {
    return <p className="text-lg">We couldn&apos;t load your order just now. Please refresh the page in a moment.</p>;
  }
  if (!order) notFound();

  const paid = order.paymentStatus === "paid";
  const firstName = order.customerName.split(" ")[0];

  if (order.orderStatus === "cancelled") {
    const refunded = order.paymentStatus === "refunded" || order.refundStatus !== "none";
    return (
      <div className="max-w-2xl">
        <Eyebrow>Order #{order.orderNumber}</Eyebrow>
        <h1 className={`mt-3 ${h1}`}>{refunded ? "This order was cancelled." : "This order wasn't paid."}</h1>
        <p className="mt-6 text-lg">
          {refunded
            ? "We've refunded your payment. Refunds usually take 5 to 10 working days to reach your account."
            : "No money was taken. Your basket is still saved if you'd like to try again."}
        </p>
        <Link href="/order" className={buttonClasses("primary", "md", "mt-8")}>
          Back to the menu
        </Link>
      </div>
    );
  }

  if (!paid) {
    return (
      <div className="max-w-2xl">
        <Eyebrow>Order #{order.orderNumber}</Eyebrow>
        <h1 className={`mt-3 ${h1}`}>Nearly there.</h1>
        <div className="mt-6">
          <PaymentStatusPoller
            token={token}
            initial={{ paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }}
          />
        </div>
        {order.paymentStatus === "failed" && (
          <p className="mt-6 text-[17px] text-muted">
            If your card was declined, you can{" "}
            <Link href="/order/checkout" className="font-semibold text-pimento underline decoration-sorrel underline-offset-4">
              try again
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  const ready = order.estimatedReadyAt ? formatClock(order.estimatedReadyAt) : null;
  const headsUp = orderHeadsUp(order.items);
  const line =
    order.scheduledFor && order.orderStatus === "confirmed"
      ? "We've got your order. We'll have it ready for your collection time."
      : kitchenLine[order.orderStatus];

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_26rem] lg:gap-16">
      <ClearBasket />
      <div>
        <Eyebrow>Order confirmed</Eyebrow>
        <h1 className={`mt-3 ${h1}`}>Thank you, {firstName}.</h1>
        <p className="mt-4 max-w-measure text-lg text-muted">{line}</p>
        {headsUp && <p className="mt-4 max-w-measure text-lg font-semibold text-sorrel">{headsUp}</p>}

        <dl className="mt-10 grid gap-px overflow-hidden rounded-card border border-hairline bg-hairline sm:grid-cols-2">
          <div className="bg-paper p-5 md:p-6">
            <dt className="text-[13px] font-semibold uppercase tracking-[0.32em] text-sorrel">Order number</dt>
            <dd className="mt-2 font-display text-[44px] font-semibold leading-none tracking-[-0.015em]">
              #{order.orderNumber}
            </dd>
          </div>
          <div className="bg-paper p-5 md:p-6">
            <dt className="text-[13px] font-semibold uppercase tracking-[0.32em] text-sorrel">
              {order.scheduledFor ? "Collection time" : "Collect at"}
            </dt>
            {order.scheduledFor ? (
              <dd className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-[-0.015em]" data-collection-time>
                {formatCollectionLong(order.scheduledFor)}
              </dd>
            ) : (
              <dd className="mt-2 font-display text-[44px] font-semibold leading-none tracking-[-0.015em]" data-collection-time>
                {ready ? `About ${ready}` : `In about ${order.leadMinutes} min`}
              </dd>
            )}
          </div>
        </dl>

        <p className="mt-8 max-w-measure text-lg">
          Collect from <strong className="font-semibold">{COLLECTION_ADDRESS}</strong>. Give us your order number when
          you arrive.
        </p>
        <p className="mt-4 text-[17px] text-muted">We&apos;ve emailed your receipt to {order.customerEmail}.</p>
        <ServiceNote className="mt-6 text-muted" />
      </div>

      <aside aria-labelledby="confirmation-items">
        <div className="rounded-card border border-hairline bg-paper p-5 md:p-6">
          <h2 id="confirmation-items" className={h3}>
            Your order
          </h2>
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold">
                    {item.quantity} × {item.name}
                  </p>
                  {item.options.length > 0 && <p className="text-[15px] text-muted">{item.options.join(", ")}</p>}
                </div>
                <p className="tabular-nums">{formatPence(item.lineTotalPence)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <p className="font-semibold">Total paid</p>
            <p className="font-display text-3xl font-semibold text-sorrel tabular-nums">{formatPence(order.totalPence)}</p>
          </div>
          {order.note && (
            <p className="mt-4 border-t border-hairline pt-4 text-[15px]">
              <span className="text-muted">Your note:</span> {order.note}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
