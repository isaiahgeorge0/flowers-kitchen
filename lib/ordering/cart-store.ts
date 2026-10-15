"use client";

import { useSyncExternalStore } from "react";
import { MAX_LINE_QUANTITY } from "./limits";
import { cartLineKey, type BasketFlag, type CartLine } from "./types";

// The basket lives in localStorage (ported from the template's storefront session cart), so it
// survives the trip to Stripe and back, and stays in step across tabs.

const CART_KEY = "fk_cart_v1";
const NONCE_KEY = "fk_checkout_nonce";
const EMPTY: CartLine[] = [];
const EMPTY_FLAGS: Record<string, BasketFlag> = {};

let lines: CartLine[] | null = null;
let drawerOpen = false;
// Lines checkout refused this visit. Not saved: the basket re-checks against the live menu anyway.
let flags: Record<string, BasketFlag> = {};
const listeners = new Set<() => void>();

function isLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.boxId === "string" &&
    typeof line.name === "string" &&
    Array.isArray(line.optionIds) &&
    line.optionIds.every((id) => typeof id === "string") &&
    Array.isArray(line.optionLabels) &&
    line.optionLabels.every((label) => typeof label === "string") &&
    Number.isInteger(line.unitPence) &&
    Number.isInteger(line.quantity) &&
    (line.quantity as number) >= 1 &&
    (line.quantity as number) <= MAX_LINE_QUANTITY
  );
}

function load(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "null");
    const saved = parsed && typeof parsed === "object" ? (parsed as { lines?: unknown }).lines : null;
    if (!Array.isArray(saved)) return EMPTY;
    return saved.filter(isLine).map((line) => ({ ...line, key: cartLineKey(line.boxId, line.optionIds) }));
  } catch {
    return EMPTY;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function save(next: CartLine[]) {
  lines = next;
  const keys = new Set(next.map((line) => line.key));
  flags = Object.fromEntries(Object.entries(flags).filter(([key]) => keys.has(key)));
  try {
    if (next.length === 0) window.localStorage.removeItem(CART_KEY);
    else window.localStorage.setItem(CART_KEY, JSON.stringify({ v: 1, lines: next }));
  } catch {
    // Private browsing or full storage: the basket still works for this page.
  }
  emit();
}

function getLines() {
  if (lines === null) lines = typeof window === "undefined" ? EMPTY : load();
  return lines;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CART_KEY) return;
    lines = load();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  add(line: Omit<CartLine, "key">) {
    const key = cartLineKey(line.boxId, line.optionIds);
    const current = getLines();
    const existing = current.find((item) => item.key === key);
    save(
      existing
        ? current.map((item) =>
            item.key === key
              ? { ...item, unitPence: line.unitPence, quantity: Math.min(item.quantity + line.quantity, MAX_LINE_QUANTITY) }
              : item,
          )
        : [...current, { ...line, key, quantity: Math.min(line.quantity, MAX_LINE_QUANTITY) }],
    );
  },
  setQuantity(key: string, quantity: number) {
    if (quantity < 1) return cart.remove(key);
    save(getLines().map((item) => (item.key === key ? { ...item, quantity: Math.min(quantity, MAX_LINE_QUANTITY) } : item)));
  },
  remove(key: string) {
    save(getLines().filter((item) => item.key !== key));
  },
  replace(next: CartLine[]) {
    save(next);
  },
  /** Swaps a choice that ran out for one still on (same quantity), merging with a matching line. */
  swapOption(key: string, swap: NonNullable<BasketFlag["swap"]>) {
    const current = getLines();
    const line = current.find((item) => item.key === key);
    if (!line) return;
    const at = line.optionIds.indexOf(swap.fromId);
    if (at === -1) return;
    const optionIds = line.optionIds.map((id, i) => (i === at ? swap.toId : id));
    const optionLabels = line.optionLabels.map((label, i) => (i === at ? swap.toName : label));
    const nextKey = cartLineKey(line.boxId, optionIds);
    const merged = current.find((item) => item.key === nextKey);
    save(
      current.flatMap((item) => {
        if (item.key === key) {
          return merged ? [] : [{ ...item, key: nextKey, optionIds, optionLabels }];
        }
        if (item.key === nextKey) return [{ ...item, quantity: Math.min(item.quantity + line.quantity, MAX_LINE_QUANTITY) }];
        return [item];
      }),
    );
  },
  flag(flag: BasketFlag) {
    flags = { ...flags, [flag.key]: flag };
    emit();
  },
  clear() {
    save(EMPTY);
    try {
      window.sessionStorage.removeItem(NONCE_KEY);
    } catch {}
  },
  openDrawer() {
    drawerOpen = true;
    emit();
  },
  closeDrawer() {
    drawerOpen = false;
    emit();
  },
};

export function useCart() {
  return useSyncExternalStore(subscribe, getLines, () => EMPTY);
}

export function useBasketFlags() {
  return useSyncExternalStore(subscribe, () => flags, () => EMPTY_FLAGS);
}

export function useCartDrawerOpen() {
  return useSyncExternalStore(subscribe, () => drawerOpen, () => false);
}

const noopSubscribe = () => () => {};

/** False during server render and hydration; true once the saved basket can be read. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function cartTotals(items: CartLine[]) {
  return {
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPence: items.reduce((sum, item) => sum + item.unitPence * item.quantity, 0),
  };
}

/** One id per checkout visit, so a second Pay tap reuses or replaces the first attempt. */
export function checkoutNonce() {
  try {
    const existing = window.sessionStorage.getItem(NONCE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(NONCE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}
