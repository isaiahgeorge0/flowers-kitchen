/** Quick reasons in the kitchen's cancel sheet; saved verbatim so order history groups cleanly. */
export const CANCEL_REASONS = ["Out of stock", "Customer asked", "Kitchen closing", "Other"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export const DEFAULT_CANCEL_REASON = "Cancelled by the kitchen";

/** "Out of stock", "Out of stock: curry goat", just the details, or the default. */
export function cancelReasonText(reason: string | null, details: string): string {
  const chip = CANCEL_REASONS.find((value) => value === reason);
  const text = details.trim().replace(/\s+/g, " ");
  if (chip && text) return `${chip}: ${text}`.slice(0, 200);
  return chip ?? (text.slice(0, 200) || DEFAULT_CANCEL_REASON);
}
