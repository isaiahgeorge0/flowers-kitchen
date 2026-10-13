"use client";

import type { OrderSource } from "./types";

// Where the order started: the counter QR code links to /order?src=qr. Remembered in this browser
// for a few hours so it survives browsing the menu and the trip to checkout; cleared once paid.

const SOURCE_KEY = "fk_order_src";
const SOURCE_TTL_MS = 6 * 60 * 60_000;

/** Call on /order: remembers a QR visit from the URL. */
export function captureOrderSource() {
  try {
    if (new URLSearchParams(window.location.search).get("src") !== "qr") return;
    window.localStorage.setItem(SOURCE_KEY, JSON.stringify({ src: "qr", at: Date.now() }));
  } catch {}
}

export function readOrderSource(): OrderSource {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SOURCE_KEY) ?? "null") as { src?: unknown; at?: unknown } | null;
    if (saved?.src === "qr" && typeof saved.at === "number" && Date.now() - saved.at < SOURCE_TTL_MS) return "qr";
  } catch {}
  return "web";
}

export function clearOrderSource() {
  try {
    window.localStorage.removeItem(SOURCE_KEY);
  } catch {}
}
