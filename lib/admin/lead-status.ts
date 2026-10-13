import { BUSINESS_TIME_ZONE } from "@/lib/catering";

/** Mirrors the `catering_enquiries.status` CHECK constraint, in pipeline order. */
export const LEAD_STATUSES = ["new", "contacted", "quoted", "booked", "lost"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  lost: "Lost",
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

export const LEAD_STATUS_CHIP: Record<LeadStatus, string> = {
  new: "border-sorrel bg-sorrel text-cream",
  contacted: "border-pimento bg-paper text-pimento",
  quoted: "border-allspice bg-paper text-pimento",
  booked: "border-mountain bg-mountain text-cream",
  lost: "border-hairline bg-cream text-muted",
};

const timestampFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "13 Oct 2026, 14:05" in UK time. */
export function formatTimestamp(iso: string) {
  return timestampFormat.format(new Date(iso));
}

const shortDateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "Sat 24 Oct 2026" for a YYYY-MM-DD event date. */
export function formatEventDate(isoDate: string) {
  return shortDateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatQuote(amount: number) {
  return gbp.format(amount);
}
