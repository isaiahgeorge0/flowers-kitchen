import "server-only";
import type Stripe from "stripe";

export type IgnoreReason = "not_ours" | "order_missing";

/** The event isn't for a site order: it's recorded as ignored and acknowledged, never retried. */
export type Ignored = { ignored: true; reason: IgnoreReason };

/** What a webhook handler returns: the order it touched (or null), or why it was ignored. */
export type HandlerOutcome = string | null | Ignored;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** metadata.order_id, only if it's shaped like ours: other integrations may use the same key. */
export function metadataOrderId(metadata: Stripe.Metadata | null | undefined) {
  const value = metadata?.order_id;
  return value && UUID.test(value) ? value : null;
}

export const isIgnored = (outcome: HandlerOutcome): outcome is Ignored =>
  typeof outcome === "object" && outcome !== null && outcome.ignored;

/**
 * No order matched. Without metadata.order_id the object isn't ours (Payment Links, invoices,
 * manual charges). With one, that order no longer exists, and retrying won't bring it back.
 */
export function unmatched(event: Stripe.Event, metadataOrderId: string | null | undefined): Ignored {
  if (!metadataOrderId) return { ignored: true, reason: "not_ours" };
  console.error(
    `[stripe/webhook] ${event.type} ${event.id} names order ${metadataOrderId}, which doesn't exist; ignoring.`,
  );
  return { ignored: true, reason: "order_missing" };
}
