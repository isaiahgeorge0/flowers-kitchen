"use client";

import { useActionState } from "react";
import { saveCollectionSettingsAction } from "@/app/admin/(protected)/settings/actions";
import { ActionFeedback, SubmitButton } from "@/components/admin/ActionUi";
import { adminInput, adminLabel } from "@/components/admin/AdminUi";
import { idleActionState } from "@/lib/admin/types";
import { SLOT_MINUTE_OPTIONS } from "@/lib/ordering/limits";
import type { OrderingSettings } from "@/lib/ordering/types";

type Field = {
  name: "leadMinutes" | "maxOrdersPerSlot" | "daysAhead" | "cutoffMinutes";
  label: string;
  hint: string;
  min: number;
  max: number;
};

const FIELDS: Field[] = [
  {
    name: "leadMinutes",
    label: "ASAP time (minutes)",
    hint: "Customers see “ready in about N minutes”. Last ASAP orders are this long before closing.",
    min: 5,
    max: 180,
  },
  {
    name: "maxOrdersPerSlot",
    label: "Orders per slot",
    hint: "Once a slot has this many orders, customers can't choose it.",
    min: 1,
    max: 100,
  },
  {
    name: "daysAhead",
    label: "Days ahead",
    hint: "How far ahead customers can book. 0 means today only.",
    min: 0,
    max: 14,
  },
  {
    name: "cutoffMinutes",
    label: "Same-day cut-off (minutes before closing)",
    hint: "No more times for today once it's this close to closing.",
    min: 0,
    max: 240,
  },
];

export function CollectionSettingsForm({ settings }: { settings: OrderingSettings }) {
  const [state, action] = useActionState(saveCollectionSettingsAction, idleActionState);
  const typed = state.ok ? undefined : state.values;
  const saved: Record<Field["name"], number> = {
    leadMinutes: settings.leadMinutes,
    maxOrdersPerSlot: settings.maxOrdersPerSlot,
    daysAhead: settings.daysAhead,
    cutoffMinutes: settings.sameDayCutoffMinutes,
  };

  return (
    <form action={action} key={state.at} className="mt-5">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="slot-minutes" className={adminLabel}>
            Slot length
          </label>
          <select
            id="slot-minutes"
            name="slotMinutes"
            defaultValue={typed?.slotMinutes ?? String(settings.slotMinutes)}
            aria-describedby="slot-minutes-hint"
            className={adminInput}
          >
            {SLOT_MINUTE_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
          <p id="slot-minutes-hint" className="mt-2 text-[15px] text-muted">
            Customers choosing a time pick from slots this long.
          </p>
        </div>
        {FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={`collection-${field.name}`} className={adminLabel}>
              {field.label}
            </label>
            <input
              id={`collection-${field.name}`}
              name={field.name}
              type="number"
              inputMode="numeric"
              min={field.min}
              max={field.max}
              step={1}
              required
              defaultValue={typed?.[field.name] ?? String(saved[field.name])}
              aria-describedby={`collection-${field.name}-hint`}
              className={adminInput}
            />
            <p id={`collection-${field.name}-hint`} className="mt-2 text-[15px] text-muted">
              {field.hint}
            </p>
          </div>
        ))}
      </div>

      <fieldset className="mt-8 space-y-4 border-t border-hairline pt-6">
        <legend className="sr-only">Pause and emails</legend>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="pauseAllowsScheduled"
            defaultChecked={typed ? typed.pauseAllowsScheduled === "on" : settings.pauseAllowsScheduled}
            className="mt-0.5 size-6 shrink-0 accent-mountain"
          />
          <span>
            <span className="block font-semibold">Take orders for later times while paused</span>
            <span className="block text-[15px] text-muted">
              When the kitchen pauses ordering, only ASAP orders stop. Untick to stop all online orders during a pause.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="readyEmailEnabled"
            defaultChecked={typed ? typed.readyEmailEnabled === "on" : settings.readyEmailEnabled}
            className="mt-0.5 size-6 shrink-0 accent-mountain"
          />
          <span>
            <span className="block font-semibold">Email customers when their order is ready</span>
            <span className="block text-[15px] text-muted">Sent when the kitchen taps Mark ready.</span>
          </span>
        </label>
      </fieldset>

      <ActionFeedback state={state} className="mt-5" />
      <div className="mt-5">
        <SubmitButton size="md">Save collection times</SubmitButton>
      </div>
    </form>
  );
}
