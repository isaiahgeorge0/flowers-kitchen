"use server";

import { redirect } from "next/navigation";
import { startCheckout } from "@/lib/ordering/checkout";
import type { CustomerErrors, CustomerValues } from "@/lib/ordering/customer";
import type { BasketFlag, CartLine } from "@/lib/ordering/types";

export type CheckoutFormState = {
  message: string | null;
  fieldErrors: CustomerErrors;
  values: CustomerValues;
  /** Repriced basket when prices changed, so the customer sees the new total before paying. */
  cart: CartLine[] | null;
  /** A line that can't be ordered as it is; the basket opens with it flagged. */
  flag?: BasketFlag | null;
  attempt: number;
  /** The chosen collection time was taken or has gone; the picker reloads. */
  slotsChanged?: boolean;
};

const text = (formData: FormData, name: string, max = 1000) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.slice(0, max) : "";
};

export async function checkoutAction(previous: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const values: CustomerValues = {
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    note: text(formData, "note"),
  };

  let cart: unknown = null;
  try {
    cart = JSON.parse(text(formData, "cart", 20_000) || "null");
  } catch {}

  const result = await startCheckout({
    cart,
    expectedTotalPence: Number(text(formData, "expectedTotalPence")),
    nonce: text(formData, "nonce"),
    customer: values,
    collection: { type: text(formData, "collection", 20), slot: text(formData, "slot", 40) },
    source: text(formData, "source", 10),
  });

  if (result.ok) redirect(result.url);

  return {
    message: result.message,
    fieldErrors: result.fieldErrors ?? {},
    values,
    cart: result.cart ?? null,
    flag: result.flag ?? null,
    attempt: previous.attempt + 1,
    slotsChanged: result.slotsChanged === true,
  };
}
