"use client";

import { useState } from "react";
import { ChoiceCard } from "@/components/catering/fields";
import { closedMessage } from "@/lib/ordering/hours";
import { COLLECTION_ADDRESS } from "@/lib/ordering/limits";
import type { SlotsState } from "@/lib/ordering/use-collection-slots";
import type { OrderingState } from "@/lib/ordering/use-ordering-status";

export type CollectionValue = { type: "asap" | "scheduled"; slot: string };

const onDay = (label: string) => (label === "Today" || label === "Tomorrow" ? label.toLowerCase() : label);

/**
 * ASAP or a chosen collection time. Availability comes from the server (with live capacity), so
 * full slots show greyed out; checkout checks the chosen slot again before taking payment.
 */
export function CollectionPicker({
  state,
  leadMinutes,
  value,
  onChange,
  slots,
}: {
  state: OrderingState | null;
  leadMinutes: number;
  /** `slot` is already checked against `slots`: "" when the chosen time has gone or filled. */
  value: CollectionValue;
  onChange: (value: CollectionValue) => void;
  slots: SlotsState;
}) {
  const [day, setDay] = useState<string | null>(null);
  const asapOpen = state?.status.open === true;
  const canSchedule = state?.canSchedule === true;
  const scheduled = value.type === "scheduled";

  const days = slots.status === "ready" ? slots.days : [];
  const bookable = days.filter((candidate) => candidate.slots.some((slot) => !slot.full));
  const chosenDay = days.find((candidate) => candidate.slots.some((slot) => slot.start === value.slot));
  const activeDay = days.find((candidate) => candidate.date === day) ?? chosenDay ?? bookable[0] ?? days[0];
  const chosen = chosenDay?.slots.find((slot) => slot.start === value.slot);

  const asapNote = !state
    ? "Checking opening times…"
    : asapOpen
      ? `Ready in about ${leadMinutes} minutes`
      : state.status.open
        ? ""
        : closedMessage(state.status);

  return (
    <section aria-labelledby="checkout-collection" className="mt-12">
      <h2 id="checkout-collection" className="font-display text-[28px] font-semibold leading-tight">
        Collection
      </h2>
      <p className="mt-1 text-muted">Collection only — {COLLECTION_ADDRESS}</p>

      <fieldset className="mt-4">
        <legend className="sr-only">When would you like to collect?</legend>
        <div className="grid gap-3">
          <ChoiceCard
            type="radio"
            name="collectionChoice"
            value="asap"
            checked={value.type === "asap"}
            onChange={() => onChange({ type: "asap", slot: "" })}
            label="As soon as possible"
            description={asapNote}
            disabled={!asapOpen}
          />
          <ChoiceCard
            type="radio"
            name="collectionChoice"
            value="scheduled"
            checked={scheduled}
            onChange={() => onChange({ type: "scheduled", slot: value.slot })}
            label="Choose a time"
            description={canSchedule ? "Pick a day and a time to collect" : "No collection times available right now"}
            disabled={!canSchedule}
          />
        </div>
      </fieldset>

      {scheduled && (
        <div className="mt-6" data-time-picker>
          {slots.status === "loading" ? (
            <p className="text-muted" role="status">
              Loading collection times…
            </p>
          ) : slots.status === "error" ? (
            <p role="alert" className="text-sorrel">
              We couldn&apos;t load collection times. Please refresh the page and try again.
            </p>
          ) : bookable.length === 0 ? (
            <p role="status" className="text-muted">
              Every collection time is taken at the moment. Please try again later.
            </p>
          ) : (
            <>
              <fieldset className="min-w-0">
                <legend className="font-semibold">Day</legend>
                <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                  {days.map((candidate) => {
                    const available = candidate.slots.some((slot) => !slot.full);
                    const note =
                      candidate.status === "closed" ? "Closed" : !available ? (candidate.slots.length ? "Full" : "No times") : "";
                    return (
                      <label
                        key={candidate.date}
                        className="relative flex min-h-16 min-w-[5.5rem] shrink-0 cursor-pointer flex-col items-center justify-center rounded-sm border border-hairline bg-paper px-3 py-2 text-center transition-colors duration-300 ease-out has-checked:border-sorrel has-checked:shadow-[inset_0_0_0_1px_var(--color-sorrel)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus-ring)] has-disabled:cursor-not-allowed has-disabled:bg-cream has-disabled:text-muted"
                      >
                        <input
                          type="radio"
                          name="collectionDay"
                          value={candidate.date}
                          checked={activeDay?.date === candidate.date}
                          disabled={!available}
                          onChange={() => {
                            setDay(candidate.date);
                            onChange({ type: "scheduled", slot: "" });
                          }}
                          className="sr-only"
                        />
                        <span className="text-[15px] font-semibold leading-tight">{candidate.label}</span>
                        {note && <span className="text-[13px] leading-tight">{note}</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {activeDay && (
                <fieldset className="mt-5">
                  <legend className="font-semibold">Times {activeDay.label === "Today" || activeDay.label === "Tomorrow" ? "" : "on "}{onDay(activeDay.label)}</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {activeDay.slots.map((slot) => (
                      <label
                        key={slot.start}
                        className="relative flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-sm border border-hairline bg-paper px-2 py-1 text-center tabular-nums transition-colors duration-300 ease-out has-checked:border-sorrel has-checked:bg-sorrel has-checked:text-cream has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus-ring)] has-disabled:cursor-not-allowed has-disabled:border-hairline has-disabled:bg-cream has-disabled:text-muted has-disabled:opacity-70"
                      >
                        <input
                          type="radio"
                          name="collectionSlot"
                          value={slot.start}
                          checked={value.slot === slot.start}
                          disabled={slot.full}
                          onChange={() => onChange({ type: "scheduled", slot: slot.start })}
                          className="sr-only"
                        />
                        <span className={`text-[17px] font-semibold ${slot.full ? "line-through decoration-1" : ""}`}>
                          {slot.time}
                        </span>
                        {slot.full && <span className="text-[12px] uppercase tracking-[0.08em]">Full</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {chosen && chosenDay && (
                <p className="mt-4 text-[17px]" role="status">
                  Collect{chosenDay.label === "Today" || chosenDay.label === "Tomorrow" ? " " : " on "}
                  <strong className="font-semibold">{onDay(chosenDay.label)}</strong> at{" "}
                  <strong className="font-semibold">{chosen.time}</strong>.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
