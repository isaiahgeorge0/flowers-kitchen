import {
  estimate,
  estimateLines,
  formatDate,
  guestsInRange,
  mainName,
  occasionLabel,
  serviceLabel,
  tablesFor,
  type CateringEvent,
} from "@/lib/catering";

export function SummaryPanel({ event }: { event: CateringEvent }) {
  const lines = estimateLines(estimate(event));
  const date = formatDate(event.date);

  const rows: { label: string; value: string | null; extra?: string }[] = [
    { label: "Occasion", value: occasionLabel(event.occasion) },
    {
      label: "Guests",
      value: guestsInRange(event.guests)
        ? `${event.guests} · about ${tablesFor(event.guests)} tables`
        : null,
    },
    { label: "Service", value: serviceLabel(event.service) },
    {
      label: "Food",
      value: event.mains.length ? event.mains.map(mainName).join(", ") : null,
      extra: event.extras.length ? `+ ${event.extras.join(", ")}` : undefined,
    },
    {
      label: "Date",
      value: date ? (event.time ? `${date}, ${event.time}` : date) : null,
    },
  ];

  return (
    <section
      aria-labelledby="catering-summary-heading"
      className="rounded-card border border-hairline bg-paper p-5 md:p-6"
    >
      <h2
        id="catering-summary-heading"
        className="text-[13px] font-semibold uppercase leading-none tracking-[0.32em] text-sorrel"
      >
        Your event
      </h2>

      <dl className="mt-5 divide-y divide-hairline text-[15px]">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[6rem_1fr] gap-4 py-2.5">
            <dt className="text-muted">{row.label}</dt>
            <dd>
              {row.value ?? <span className="text-muted">Not chosen yet</span>}
              {row.extra && <span className="block text-muted">{row.extra}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-t border-hairline pt-5">
        <p className="font-display text-2xl font-semibold text-sorrel">
          {lines.perHead}
        </p>
        <p className="mt-1">{lines.total}</p>
        <p className="mt-3 text-[13px] text-muted">
          An estimate only, and your final quote comes from the family.
        </p>
      </div>
    </section>
  );
}
