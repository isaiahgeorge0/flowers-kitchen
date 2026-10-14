import type { ReactNode } from "react";
import { closedMessage } from "@/lib/ordering/hours";
import type { OrderingState } from "@/lib/ordering/use-ordering-status";

type Tone = "open" | "ahead" | "closed" | "pending";

const dots: Record<Tone, string> = {
  open: "bg-mountain",
  ahead: "bg-mountain",
  closed: "bg-sorrel",
  pending: "bg-hairline",
};

function Banner({
  tone,
  title,
  children,
  ...rest
}: {
  tone: Tone;
  title?: ReactNode;
  children: ReactNode;
  role?: "status";
  "aria-live"?: "polite";
  "data-paused"?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 rounded-card border border-hairline bg-paper px-5 py-4 md:px-6 md:py-5" {...rest}>
      <span aria-hidden className={`mt-[7px] size-2.5 shrink-0 rounded-pill ${dots[tone]}`} />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={`${title ? "mt-0.5" : ""} text-[16px] leading-[1.55] text-muted`}>{children}</div>
      </div>
    </div>
  );
}

export function OrderingBanner({
  state,
  leadMinutes,
  daysAhead,
}: {
  state: OrderingState | null;
  leadMinutes: number;
  daysAhead: number;
}) {
  if (state === null) {
    return (
      <Banner tone="pending" aria-live="polite">
        Checking opening times…
      </Banner>
    );
  }

  const { status, canSchedule } = state;
  const ahead = daysAhead === 0 ? "later today" : `up to ${daysAhead} ${daysAhead === 1 ? "day" : "days"} ahead`;

  if (status.open) {
    return (
      <Banner tone="open" title="Open for orders" aria-live="polite">
        Ready in about {leadMinutes} minutes. Last orders {status.lastOrders}.
        {canSchedule && ` Or choose a collection time ${ahead}.`}
      </Banner>
    );
  }

  if (status.reason === "paused") {
    return (
      <Banner tone="closed" title={closedMessage(status)} role="status" data-paused>
        {canSchedule
          ? "You can still order now for a later collection time."
          : "You can still look through the menu."}
      </Banner>
    );
  }

  if (canSchedule) {
    return (
      <Banner tone="ahead" title="Order ahead" role="status">
        {closedMessage(status)} You can order now and choose a collection time {ahead}.
      </Banner>
    );
  }

  return (
    <Banner tone="closed" title="Online ordering is closed" role="status">
      {closedMessage(status)} You can still look through the menu.
    </Banner>
  );
}
