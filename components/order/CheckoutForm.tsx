"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { checkoutAction, type CheckoutFormState } from "@/app/(site)/order/checkout/actions";
import { Button, buttonClasses } from "@/components/Button";
import { inputClasses } from "@/components/catering/fields";
import { Eyebrow } from "@/components/Eyebrow";
import { cart, cartTotals, checkoutNonce, useCart, useHydrated } from "@/lib/ordering/cart-store";
import { CUSTOMER_LIMITS, type CustomerValues } from "@/lib/ordering/customer";
import { formatPence } from "@/lib/ordering/money";
import { readOrderSource } from "@/lib/ordering/order-source";
import type { OrderingSettings } from "@/lib/ordering/types";
import { useCollectionSlots, validSlot } from "@/lib/ordering/use-collection-slots";
import { useOrderingStatus } from "@/lib/ordering/use-ordering-status";
import { h1 } from "@/lib/typography";
import { CollectionPicker, type CollectionValue } from "./CollectionPicker";
import { OrderingBanner } from "./OrderingBanner";

const initialState: CheckoutFormState = {
  message: null,
  fieldErrors: {},
  values: { name: "", phone: "", email: "", note: "" },
  cart: null,
  attempt: 0,
};

const fields: {
  name: keyof CustomerValues;
  label: string;
  type: string;
  autoComplete: string;
  inputMode?: "tel" | "email";
  hint?: string;
}[] = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "phone", label: "Mobile number", type: "tel", autoComplete: "tel", inputMode: "tel", hint: "We'll only call if there's a problem with your order." },
  { name: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email", hint: "We'll email your receipt here." },
];

export function CheckoutForm({ settings }: { settings: OrderingSettings }) {
  const hydrated = useHydrated();
  const lines = useCart();
  const ordering = useOrderingStatus(settings);
  const [state, formAction, pending] = useActionState(checkoutAction, initialState);
  const errorRef = useRef<HTMLDivElement>(null);
  const { count, totalPence } = cartTotals(lines);

  const [choice, setChoice] = useState<CollectionValue | null>(null);
  const [reloads, setReloads] = useState(0);
  const asapOpen = ordering?.status.open === true;
  const canSchedule = ordering?.canSchedule === true;
  const type: CollectionValue["type"] =
    choice?.type === "asap" && asapOpen
      ? "asap"
      : choice?.type === "scheduled" && canSchedule
        ? "scheduled"
        : asapOpen || !canSchedule
          ? "asap"
          : "scheduled";
  const slots = useCollectionSlots(type === "scheduled", `${reloads}:${state.slotsChanged ? state.attempt : 0}`);
  const slot = type === "scheduled" ? validSlot(slots, choice?.slot ?? "") : "";

  const chooseCollection = (next: CollectionValue) => {
    if (next.type === "scheduled" && type !== "scheduled") setReloads((value) => value + 1);
    setChoice(next);
  };

  useEffect(() => {
    if (state.cart) cart.replace(state.cart);
    if (state.message) errorRef.current?.focus();
  }, [state]);

  if (!hydrated) {
    return <p className="mt-10 text-muted">Loading your basket…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 max-w-xl rounded-sm border border-hairline bg-paper px-6 py-8">
        <p className="font-display text-2xl font-semibold">Your basket is empty</p>
        <p className="mt-2 text-muted">Choose a box first, then come back here to pay.</p>
        <Link href="/order" className={buttonClasses("primary", "md", "mt-6")}>
          See the boxes
        </Link>
      </div>
    );
  }

  const needsSlot = type === "scheduled" && !slot;
  const canPay = !pending && (type === "asap" ? asapOpen : Boolean(slot));

  function submit(formData: FormData) {
    formData.set(
      "cart",
      JSON.stringify(lines.map((line) => ({ boxId: line.boxId, optionIds: line.optionIds, quantity: line.quantity }))),
    );
    formData.set("expectedTotalPence", String(totalPence));
    formData.set("nonce", checkoutNonce());
    formData.set("collection", type);
    formData.set("slot", slot);
    formData.set("source", readOrderSource());
    formAction(formData);
  }

  return (
    <form action={submit} noValidate className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
      <div className="order-2 min-w-0 lg:order-1">
        {state.message && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mb-8 rounded-sm border border-hairline border-l-4 border-l-sorrel bg-paper px-5 py-4"
          >
            <p className="font-semibold">{state.message}</p>
            {state.cart && <p className="mt-1 text-[15px] text-muted">Your basket has been updated with today&apos;s prices.</p>}
          </div>
        )}

        <fieldset>
          <legend className="font-display text-[28px] font-semibold leading-tight">Your details</legend>
          <div className="mt-6 grid gap-6">
            {fields.map((field) => {
              const error = state.fieldErrors[field.name];
              const describedBy = [field.hint && `checkout-${field.name}-hint`, error && `checkout-${field.name}-error`]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={field.name}>
                  <label htmlFor={`checkout-${field.name}`} className="block font-semibold">
                    {field.label}
                  </label>
                  {field.hint && (
                    <p id={`checkout-${field.name}-hint`} className="mt-1 text-[15px] text-muted">
                      {field.hint}
                    </p>
                  )}
                  <input
                    key={`${field.name}-${state.attempt}`}
                    id={`checkout-${field.name}`}
                    name={field.name}
                    type={field.type}
                    inputMode={field.inputMode}
                    autoComplete={field.autoComplete}
                    required
                    maxLength={CUSTOMER_LIMITS[field.name]}
                    defaultValue={state.values[field.name]}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy || undefined}
                    className={inputClasses}
                  />
                  {error && (
                    <p id={`checkout-${field.name}-error`} className="mt-2 text-[15px] text-sorrel">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}

            <div>
              <label htmlFor="checkout-note" className="block font-semibold">
                Note for the kitchen <span className="font-normal text-muted">(optional)</span>
              </label>
              <p id="checkout-note-hint" className="mt-1 text-[15px] text-muted">
                Allergies, or anything we should know.
              </p>
              <textarea
                key={`note-${state.attempt}`}
                id="checkout-note"
                name="note"
                rows={3}
                maxLength={CUSTOMER_LIMITS.note}
                defaultValue={state.values.note}
                aria-invalid={state.fieldErrors.note ? true : undefined}
                aria-describedby={`checkout-note-hint${state.fieldErrors.note ? " checkout-note-error" : ""}`}
                className={`${inputClasses} resize-y`}
              />
              {state.fieldErrors.note && (
                <p id="checkout-note-error" className="mt-2 text-[15px] text-sorrel">
                  {state.fieldErrors.note}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        <CollectionPicker
          state={ordering}
          leadMinutes={settings.leadMinutes}
          value={{ type, slot }}
          onChange={chooseCollection}
          slots={slots}
        />

        <div className="mt-8 border-l-2 border-hairline pl-4 text-[15px]">
          <p className="font-semibold">Before you pay: allergens</p>
          <p className="mt-1 text-muted">
            Please check the allergens listed on each box. If you have an allergy, tell us in the note above. All our food is halal.
          </p>
        </div>

        <div className="mt-8">
          {ordering && !ordering.canOrder && (
            <OrderingBanner state={ordering} leadMinutes={settings.leadMinutes} daysAhead={settings.daysAhead} />
          )}
          <Button type="submit" className="mt-4 w-full" disabled={!canPay} aria-describedby={needsSlot ? "checkout-needs-slot" : undefined}>
            {pending ? "Taking you to payment…" : `Pay ${formatPence(totalPence)}`}
          </Button>
          {needsSlot && ordering?.canOrder && (
            <p id="checkout-needs-slot" className="mt-3 text-center text-[15px] font-semibold">
              Choose a collection time to continue.
            </p>
          )}
          <p className="mt-3 text-center text-[15px] text-muted">
            Secure payment by Stripe. Card, Apple Pay or Google Pay.
          </p>
        </div>
      </div>

      <aside aria-labelledby="checkout-summary" className="order-1 lg:order-2">
        <div className="rounded-sm border border-hairline bg-paper px-6 py-6 lg:sticky lg:top-28">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="checkout-summary" className="font-display text-[28px] font-semibold leading-tight">
              Your order
            </h2>
            <button
              type="button"
              onClick={cart.openDrawer}
              className="inline-flex min-h-11 items-center text-[15px] font-semibold text-pimento underline decoration-sorrel underline-offset-4"
            >
              Edit
            </button>
          </div>
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold">
                    {line.quantity} × {line.name}
                  </p>
                  {line.optionLabels.length > 0 && <p className="text-[15px] text-muted">{line.optionLabels.join(", ")}</p>}
                </div>
                <p className="tabular-nums">{formatPence(line.unitPence * line.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <p className="font-semibold">
              Total <span className="font-normal text-muted">· {count} {count === 1 ? "box" : "boxes"}</span>
            </p>
            <p className="font-display text-3xl font-semibold text-sorrel tabular-nums">{formatPence(totalPence)}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}

export function CheckoutHeading() {
  return (
    <div className="max-w-3xl">
      <Eyebrow>Checkout</Eyebrow>
      <h1 className={`mt-6 ${h1}`}>Pay and collect.</h1>
    </div>
  );
}
