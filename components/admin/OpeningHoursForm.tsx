"use client";

import { useActionState } from "react";
import { saveOrderingHoursAction } from "@/app/admin/(protected)/settings/actions";
import { ActionFeedback, SubmitButton } from "@/components/admin/ActionUi";
import { adminInput } from "@/components/admin/AdminUi";
import { idleActionState } from "@/lib/admin/types";
import { dayLabel, WEEKDAYS, type OpeningHours } from "@/lib/ordering/hours";

export function OpeningHoursForm({ hours, leadMinutes }: { hours: OpeningHours; leadMinutes: number }) {
  const [state, action] = useActionState(saveOrderingHoursAction, idleActionState);
  const typed = state.ok ? undefined : state.values;

  return (
    <form action={action} key={state.at} className="mt-5">
      <fieldset>
        <legend className="sr-only">Opening hours</legend>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {WEEKDAYS.map((day) => {
            const enabled = typed ? typed[`${day}_enabled`] === "on" : hours[day].enabled;
            return (
              <li key={day} className="grid gap-3 py-4 sm:grid-cols-[10rem_1fr] sm:items-center">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
                  <input
                    type="checkbox"
                    name={`${day}_enabled`}
                    defaultChecked={enabled}
                    className="size-6 accent-mountain"
                  />
                  {dayLabel(day)}
                </label>
                <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                  <label className="text-[15px] text-muted">
                    Opens
                    <input
                      type="time"
                      name={`${day}_open`}
                      defaultValue={typed?.[`${day}_open`] ?? (hours[day].enabled ? hours[day].open : "")}
                      className={`${adminInput} mt-1`}
                    />
                  </label>
                  <label className="text-[15px] text-muted">
                    Closes
                    <input
                      type="time"
                      name={`${day}_close`}
                      defaultValue={typed?.[`${day}_close`] ?? (hours[day].enabled ? hours[day].close : "")}
                      className={`${adminInput} mt-1`}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[15px] text-muted">
          Untick the days you&rsquo;re closed. A closing time after midnight works too, like 18:00 to 01:00.
        </p>
      </fieldset>

      <p className="mt-3 max-w-xl text-[15px] text-muted">
        Last ASAP orders are {leadMinutes} minutes before closing. Change that under Collection times.
      </p>

      <ActionFeedback state={state} className="mt-5" />
      <div className="mt-5">
        <SubmitButton size="md">Save opening hours</SubmitButton>
      </div>
    </form>
  );
}
