import { closedMessage } from "@/lib/ordering/hours";
import type { OrderingState } from "@/lib/ordering/use-ordering-status";

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
      <div className="rounded-sm border border-hairline bg-paper px-5 py-4 text-[17px] text-muted" aria-live="polite">
        Checking opening times…
      </div>
    );
  }

  const { status, canSchedule } = state;
  const ahead = daysAhead === 0 ? "later today" : `up to ${daysAhead} ${daysAhead === 1 ? "day" : "days"} ahead`;

  if (status.open) {
    return (
      <div className="rounded-sm border border-hairline border-l-4 border-l-mountain bg-paper px-5 py-4" aria-live="polite">
        <p className="font-semibold">Open for orders</p>
        <p className="mt-1 text-[17px] text-muted">
          Ready in about {leadMinutes} minutes. Last orders {status.lastOrders}.
          {canSchedule && ` Or choose a collection time ${ahead}.`}
        </p>
      </div>
    );
  }

  if (status.reason === "paused") {
    return (
      <div className="rounded-sm border border-hairline border-l-4 border-l-sorrel bg-paper px-5 py-4" role="status" data-paused>
        <p className="font-semibold">{closedMessage(status)}</p>
        <p className="mt-1 text-[17px] text-muted">
          {canSchedule
            ? "You can still order now for a later collection time."
            : "You can still look through the menu."}
        </p>
      </div>
    );
  }

  if (canSchedule) {
    return (
      <div className="rounded-sm border border-hairline border-l-4 border-l-mountain bg-paper px-5 py-4" role="status">
        <p className="font-semibold">Order ahead</p>
        <p className="mt-1 text-[17px] text-muted">
          {closedMessage(status)} You can order now and choose a collection time {ahead}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-hairline border-l-4 border-l-sorrel bg-paper px-5 py-4" role="status">
      <p className="font-semibold">Online ordering is closed</p>
      <p className="mt-1 text-[17px] text-muted">
        {closedMessage(status)} You can still look through the menu.
      </p>
    </div>
  );
}
