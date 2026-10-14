"use client";

import { useActionState, useRef } from "react";
import {
  updateLeadDetailsAction,
  updateLeadStatusAction,
} from "@/app/admin/(protected)/leads/actions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/admin/lead-status";
import { idleActionState } from "@/lib/admin/types";
import { ActionFeedback, SubmitButton } from "./ActionUi";
import { adminCard, adminH2, adminInput, adminLabel } from "./AdminUi";

export function LeadStatusPicker({ id, status }: { id: string; status: LeadStatus }) {
  const [state, action, pending] = useActionState(updateLeadStatusAction, idleActionState);
  const form = useRef<HTMLFormElement>(null);

  return (
    <section className={`${adminCard} p-6`} aria-labelledby="status-heading">
      <h2 id="status-heading" className={adminH2}>
        Status
      </h2>
      <form ref={form} action={action} className="mt-5">
        <input type="hidden" name="id" value={id} />
        <fieldset disabled={pending}>
          <legend className="sr-only">Lead status</legend>
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((value) => (
              <label
                key={value}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-pill border border-hairline bg-cream px-4 text-[15px] font-semibold transition-colors duration-300 ease-out hover:border-pimento has-checked:border-pimento has-checked:bg-pimento has-checked:text-cream has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus-ring)] has-disabled:cursor-wait"
              >
                <input
                  type="radio"
                  name="status"
                  value={value}
                  defaultChecked={value === status}
                  onChange={() => form.current?.requestSubmit()}
                  className="sr-only"
                />
                {LEAD_STATUS_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 min-h-6">
          {pending ? (
            <p role="status" className="text-[15px] text-muted">
              Saving…
            </p>
          ) : (
            <ActionFeedback state={state} />
          )}
        </div>
      </form>
    </section>
  );
}

export function LeadDetailsForm({
  id,
  quotedAmount,
  internalNotes,
}: {
  id: string;
  quotedAmount: number | null;
  internalNotes: string | null;
}) {
  const [state, action] = useActionState(updateLeadDetailsAction, idleActionState);
  const typed = state.ok ? undefined : state.values;

  return (
    <section className={`${adminCard} p-6`} aria-labelledby="notes-heading">
      <h2 id="notes-heading" className={adminH2}>
        Quote and notes
      </h2>
      <p className="mt-2 text-[15px] text-muted">Only staff can see these. The customer never does.</p>
      <form action={action} className="mt-5 flex flex-col gap-5">
        <input type="hidden" name="id" value={id} />
        <div>
          <label htmlFor="quoted-amount" className={adminLabel}>
            Quoted amount
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-muted">
              £
            </span>
            <input
              id="quoted-amount"
              name="quotedAmount"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={typed?.quotedAmount ?? (quotedAmount === null ? "" : quotedAmount.toFixed(2))}
              placeholder="0.00"
              className={`${adminInput} pl-8`}
              aria-describedby="quoted-amount-hint"
            />
          </div>
          <p id="quoted-amount-hint" className="mt-2 text-[15px] text-muted">
            Leave blank if you haven&rsquo;t quoted yet.
          </p>
        </div>
        <div>
          <label htmlFor="internal-notes" className={adminLabel}>
            Internal notes
          </label>
          <textarea
            id="internal-notes"
            name="internalNotes"
            rows={6}
            maxLength={5000}
            defaultValue={typed?.internalNotes ?? internalNotes ?? ""}
            placeholder="Calls, what was agreed, dietary needs, deposit…"
            className={`${adminInput} min-h-36 leading-relaxed`}
          />
        </div>
        <ActionFeedback state={state} />
        <div>
          <SubmitButton>Save quote and notes</SubmitButton>
        </div>
      </form>
    </section>
  );
}
