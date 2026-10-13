"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { saveBoxDetailsAction, setOptionAvailableAction, setSoldOutAction } from "@/app/admin/(protected)/menu/actions";
import { ActionFeedback, SubmitButton } from "@/components/admin/ActionUi";
import { adminCard, adminInput, adminLabel } from "@/components/admin/AdminUi";
import { BOX_LIMITS } from "@/lib/admin/menu-limits";
import { idleActionState } from "@/lib/admin/types";

export type EditableBox = {
  itemId: string;
  name: string;
  description: string;
  price: string;
  allergens: string;
  soldOut: boolean;
  hidden: boolean;
  groups: { id: string; name: string; options: { id: string; name: string; available: boolean }[] }[];
};

export function MenuEditor({ boxes, canEdit }: { boxes: EditableBox[]; canEdit: boolean }) {
  return (
    <ul className="space-y-6">
      {boxes.map((box) => (
        <li key={box.itemId}>
          <BoxEditor box={box} canEdit={canEdit} />
        </li>
      ))}
    </ul>
  );
}

function BoxEditor({ box, canEdit }: { box: EditableBox; canEdit: boolean }) {
  const headingId = `box-${box.itemId}`;
  return (
    <section aria-labelledby={headingId} className={`${adminCard} p-5 md:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="font-display text-[26px] font-semibold leading-tight">
            {box.name}
          </h2>
          <p className="mt-1 font-display text-[20px] font-semibold text-sorrel">£{box.price}</p>
          {box.hidden && <p className="mt-1 text-[15px] text-muted">Hidden from the menu.</p>}
        </div>
        <SoldOutToggle itemId={box.itemId} soldOut={box.soldOut} name={box.name} />
      </div>

      {box.groups.map((group) => (
        <fieldset key={group.id} className="mt-5 border-t border-hairline pt-4">
          <legend className="sr-only">{group.name} options</legend>
          <p aria-hidden className="text-[15px] font-semibold">
            {group.name}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.options.map((option) => (
              <OptionToggle key={option.id} option={option} />
            ))}
          </div>
        </fieldset>
      ))}

      {canEdit && <DetailsForm box={box} />}
    </section>
  );
}

function useToggle(initial: boolean, run: (next: boolean) => Promise<{ ok: true } | { ok: false; message: string }>) {
  const [value, setValue] = useOptimistic(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toggle = () => {
    const next = !value;
    setError(null);
    startTransition(async () => {
      setValue(next);
      const result = await run(next);
      if (!result.ok) setError(result.message);
    });
  };
  return { value, pending, error, toggle };
}

function SoldOutToggle({ itemId, soldOut, name }: { itemId: string; soldOut: boolean; name: string }) {
  const { value, pending, error, toggle } = useToggle(soldOut, (next) => setSoldOutAction(itemId, next));
  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-busy={pending}
        aria-label={`${name} sold out`}
        onClick={toggle}
        className={`inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-sm border px-5 text-[15px] font-semibold uppercase tracking-[0.08em] transition-colors duration-300 ease-out sm:w-auto ${
          value ? "border-sorrel bg-sorrel text-cream [--focus-ring:var(--color-cream)]" : "border-pimento text-pimento"
        }`}
      >
        {value ? "Sold out · Tap to bring back" : "Available · Tap if sold out"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[15px] font-semibold text-sorrel">
          {error}
        </p>
      )}
    </div>
  );
}

function OptionToggle({ option }: { option: { id: string; name: string; available: boolean } }) {
  const { value, pending, error, toggle } = useToggle(option.available, (next) =>
    setOptionAvailableAction(option.id, next),
  );
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-busy={pending}
        onClick={toggle}
        className={`inline-flex min-h-12 items-center gap-2 rounded-sm border px-4 text-[15px] font-semibold transition-colors duration-300 ease-out ${
          value ? "border-mountain bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)]" : "border-hairline bg-cream text-muted line-through"
        }`}
      >
        {option.name}
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] no-underline">
          {value ? "On" : "Off"}
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-[15px] font-semibold text-sorrel">
          {error}
        </p>
      )}
    </div>
  );
}

function DetailsForm({ box }: { box: EditableBox }) {
  const [state, action] = useActionState(saveBoxDetailsAction, idleActionState);
  const typed = state.ok ? undefined : state.values;
  const id = (field: string) => `${box.itemId}-${field}`;

  return (
    <details className="group mt-5 border-t border-hairline pt-4">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px] font-semibold uppercase tracking-[0.08em]">
        Edit name, price and allergens
        <svg aria-hidden viewBox="0 0 24 24" className="size-5 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <form action={action} className="mt-4 grid gap-5 md:grid-cols-2">
        <input type="hidden" name="id" value={box.itemId} />
        <div>
          <label htmlFor={id("name")} className={adminLabel}>
            Name
          </label>
          <input
            id={id("name")}
            name="name"
            required
            maxLength={BOX_LIMITS.name}
            defaultValue={typed?.name ?? box.name}
            className={adminInput}
          />
        </div>
        <div>
          <label htmlFor={id("price")} className={adminLabel}>
            Price
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-muted">
              £
            </span>
            <input
              id={id("price")}
              name="price"
              required
              inputMode="decimal"
              autoComplete="off"
              defaultValue={typed?.price ?? box.price}
              className={`${adminInput} pl-8`}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor={id("description")} className={adminLabel}>
            Short description
          </label>
          <textarea
            id={id("description")}
            name="description"
            rows={2}
            maxLength={BOX_LIMITS.description}
            defaultValue={typed?.description ?? box.description}
            className={`${adminInput} leading-relaxed`}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor={id("allergens")} className={adminLabel}>
            Allergens
          </label>
          <textarea
            id={id("allergens")}
            name="allergens"
            rows={2}
            required
            maxLength={BOX_LIMITS.allergens}
            defaultValue={typed?.allergens ?? box.allergens}
            aria-describedby={id("allergens-hint")}
            className={`${adminInput} leading-relaxed`}
          />
          <p id={id("allergens-hint")} className="mt-2 text-[15px] text-muted">
            Shown on the box card and before payment. Include everything in the box, sides too.
          </p>
        </div>
        <ActionFeedback state={state} className="md:col-span-2" />
        <div className="md:col-span-2">
          <SubmitButton size="md">Save {box.name}</SubmitButton>
        </div>
      </form>
    </details>
  );
}
