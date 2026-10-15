"use client";

import { CircleAlert, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { checkoutAction, type CheckoutFormState } from "@/app/(site)/order/checkout/actions";
import { Button, buttonClasses } from "@/components/Button";
import { ErrorText, hintClasses, inputClasses, labelClasses } from "@/components/catering/fields";
import { Eyebrow } from "@/components/Eyebrow";
import { cart, cartTotals, checkoutNonce, useBasketFlags, useCart, useHydrated } from "@/lib/ordering/cart-store";
import { CUSTOMER_LIMITS, type CustomerValues } from "@/lib/ordering/customer";
import { formatPence } from "@/lib/ordering/money";
import { readOrderSource } from "@/lib/ordering/order-source";
import { basketLineFlag } from "@/lib/ordering/sides";
import type { BasketAvailability, OrderingSettings } from "@/lib/ordering/types";
import { useCollectionSlots, validSlot } from "@/lib/ordering/use-collection-slots";
import { useOrderingStatus } from "@/lib/ordering/use-ordering-status";
import { h1, h3 } from "@/lib/typography";
import { BasketLineDetails } from "./BasketLineDetails";
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

export function CheckoutForm({ settings, availability }: { settings: OrderingSettings; availability?: BasketAvailability }) {
  const hydrated = useHydrated();
  const lines = useCart();
  const flags = useBasketFlags();
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
    if (state.flag) {
      cart.flag(state.flag);
      cart.openDrawer();
    } else if (state.message) errorRef.current?.focus();
  }, [state]);

  if (!hydrated) {
    return <p className="mt-10 text-muted">Loading your basket…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 max-w-xl rounded-card border border-hairline bg-paper p-6 md:p-8">
        <p className={h3}>Your basket is empty</p>
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
            className="mb-8 flex items-start gap-3 rounded-card border border-sorrel bg-sorrel/[0.05] px-5 py-4"
          >
            <CircleAlert aria-hidden strokeWidth={1.5} className="mt-0.5 size-5 shrink-0 text-sorrel" />
            <div>
              <p className="font-semibold text-sorrel">{state.message}</p>
              {state.cart && <p className="mt-1 text-[15px] text-muted">Your basket has been updated with today&apos;s prices.</p>}
            </div>
          </div>
        )}

        <fieldset>
          <legend className={h3}>Your details</legend>
          <div className="mt-6 grid gap-6">
            {fields.map((field) => {
              const error = state.fieldErrors[field.name];
              const describedBy = [field.hint && `checkout-${field.name}-hint`, error && `checkout-${field.name}-error`]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={field.name}>
                  <label htmlFor={`checkout-${field.name}`} className={labelClasses}>
                    {field.label}
                  </label>
                  {field.hint && (
                    <p id={`checkout-${field.name}-hint`} className={hintClasses}>
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
                    <ErrorText id={`checkout-${field.name}-error`} className="mt-2">
                      {error}
                    </ErrorText>
                  )}
                </div>
              );
            })}

            <div>
              <label htmlFor="checkout-note" className={labelClasses}>
                Note for the kitchen <span className="font-normal text-muted">(optional)</span>
              </label>
              <p id="checkout-note-hint" className={hintClasses}>
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
                <ErrorText id="checkout-note-error" className="mt-2">
                  {state.fieldErrors.note}
                </ErrorText>
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

        {ordering && !ordering.canOrder && (
          <div className="mt-10">
            <OrderingBanner state={ordering} leadMinutes={settings.leadMinutes} daysAhead={settings.daysAhead} />
          </div>
        )}

        <div className="mt-10 rounded-card border border-hairline bg-paper p-5 md:p-6">
          <div className="text-[15px]">
            <p className="font-semibold">Before you pay: allergens</p>
            <p className="mt-1 text-muted">
              Please check the allergens listed on each box. If you have an allergy, tell us in the note above. All our food is halal.
            </p>
          </div>
          <p className="mt-6 text-[15px] text-muted">
            By paying you agree to our{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-pimento underline decoration-sorrel underline-offset-4">
              terms<span className="sr-only"> (opens in a new tab)</span>
            </Link>
            . See how we use your details in our{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-pimento underline decoration-sorrel underline-offset-4">
              privacy policy<span className="sr-only"> (opens in a new tab)</span>
            </Link>
            .
          </p>
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={!canPay} aria-describedby={needsSlot ? "checkout-needs-slot" : undefined}>
            {pending ? "Taking you to payment…" : `Pay ${formatPence(totalPence)}`}
          </Button>
          {needsSlot && ordering?.canOrder && (
            <p id="checkout-needs-slot" className="mt-3 text-center text-[15px] font-semibold">
              Choose a collection time to continue.
            </p>
          )}
          <p className="mt-3 text-center text-[15px] text-balance text-muted">
            <LockKeyhole aria-hidden strokeWidth={1.5} className="mr-1.5 inline size-4 -translate-y-px align-middle" />
            Secure payment by Stripe. Card, Apple Pay or Google Pay.
          </p>
        </div>
      </div>

      <aside aria-labelledby="checkout-summary" className="order-1 lg:order-2">
        <div className="rounded-card border border-hairline bg-paper p-5 md:p-6 lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-4">
            <h2 id="checkout-summary" className={h3}>
              Your order
            </h2>
            <button
              type="button"
              onClick={cart.openDrawer}
              className={buttonClasses("ghost", "md", "-mr-1 decoration-sorrel")}
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
                  <BasketLineDetails
                    line={line}
                    missingSides={availability?.[line.boxId]?.missingSides}
                    flag={flags[line.key] ?? basketLineFlag(line, availability)}
                  />
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
      <h1 className={`mt-3 ${h1}`}>Pay and collect.</h1>
    </div>
  );
}
