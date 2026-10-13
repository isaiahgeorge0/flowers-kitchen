// Opening hours and "can we take an order right now?" Pure functions, used on both sides:
// the storefront shows the state, checkout re-checks it on the server.
//
// business_settings.opening_hours_json: { monday: { open: "12:00", close: "20:00", enabled: true }, ... }
// A close time at or before the open time means the kitchen closes after midnight.
// Last orders = close minus the collection lead time.

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type DayHours = { open: string; close: string; enabled: boolean };
export type OpeningHours = Record<Weekday, DayHours>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MINUTES = 24 * 60;

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

export function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const minutes = ((total % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function dayLabel(day: Weekday) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function parseOpeningHours(raw: unknown): OpeningHours {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    WEEKDAYS.map((day) => {
      const entry = source[day] as Record<string, unknown> | undefined;
      const open = isTime(entry?.open) ? entry.open : "00:00";
      const close = isTime(entry?.close) ? entry.close : "00:00";
      return [day, { open, close, enabled: entry?.enabled === true && isTime(entry?.open) && isTime(entry?.close) }];
    }),
  ) as OpeningHours;
}

export function hasOpeningHours(hours: OpeningHours) {
  return WEEKDAYS.some((day) => hours[day].enabled);
}

/** Rows for the footer and Find us. Placeholder 00:00 until hours are set in admin. */
export function openingHoursRows(hours: OpeningHours) {
  const configured = hasOpeningHours(hours);
  return WEEKDAYS.map((day) => ({
    day: dayLabel(day),
    hours: !configured
      ? "00:00 – 00:00"
      : hours[day].enabled
        ? `${hours[day].open} – ${hours[day].close}`
        : "Closed",
  }));
}

/** Opening and closing as minutes from the day's midnight; close may run past 24:00. */
export function openingWindow(day: DayHours) {
  if (!day.enabled) return null;
  const open = toMinutes(day.open);
  let close = toMinutes(day.close);
  if (close <= open) close += DAY_MINUTES;
  return { open, close };
}

/** Minutes from the day's midnight when ordering opens and last orders are taken. */
function orderingWindow(day: DayHours, leadMinutes: number) {
  const window = openingWindow(day);
  if (!window) return null;
  const end = window.close - leadMinutes;
  return end > window.open ? { start: window.open, end } : null;
}

function zonedNow(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const dayIndex = WEEKDAYS.indexOf(get("weekday").toLowerCase() as Weekday);
  return { dayIndex: Math.max(dayIndex, 0), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Midnight at the start of `at`'s day in `timeZone`, as a Date. */
export function zonedDayStart(at: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wallClockAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offset = wallClockAsUtc - Math.floor(at.getTime() / 1000) * 1000;
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")) - offset);
}

export type OrderingStatus =
  | { open: true; lastOrders: string }
  | {
      open: false;
      reason: "switched_off" | "no_hours" | "closed";
      /** e.g. { when: "tomorrow", time: "12:00" }; null when unknown. */
      next: { when: string; time: string } | null;
    }
  /** Within opening hours but staff have paused ASAP orders; resumes by itself at `resumeAt`. */
  | { open: false; reason: "paused"; resumeAt: string; next: null };

export type StatusSettings = {
  acceptingOrders: boolean;
  openingHours: OpeningHours;
  leadMinutes: number;
  timezone: string;
  pausedUntil?: string | null;
};

/** The pause end as epoch ms, or null when ordering isn't paused at `at`. */
export function activePauseEnd(pausedUntil: string | null | undefined, at: Date): number | null {
  if (!pausedUntil) return null;
  const end = Date.parse(pausedUntil);
  return Number.isFinite(end) && end > at.getTime() ? end : null;
}

export function formatClock(iso: string | number, timeZone = "Europe/London") {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(iso),
  );
}

/** Whether ASAP orders can be placed right now. */
export function orderingStatus(settings: StatusSettings, at: Date = new Date()): OrderingStatus {
  if (!settings.acceptingOrders) return { open: false, reason: "switched_off", next: null };
  if (!hasOpeningHours(settings.openingHours)) return { open: false, reason: "no_hours", next: null };

  const { dayIndex, minutes } = zonedNow(at, settings.timezone);
  const windowFor = (offset: number) =>
    orderingWindow(settings.openingHours[WEEKDAYS[(dayIndex + offset + 7) % 7]], settings.leadMinutes);
  const pauseEnd = activePauseEnd(settings.pausedUntil, at);

  // Open now (today's session, or yesterday's running past midnight), unless paused until after last orders.
  const today = windowFor(0);
  const yesterday = windowFor(-1);
  const endNow =
    today && minutes >= today.start && minutes < today.end
      ? today.end
      : yesterday && minutes + DAY_MINUTES >= yesterday.start && minutes + DAY_MINUTES < yesterday.end
        ? yesterday.end - DAY_MINUTES
        : null;
  if (endNow !== null) {
    if (pauseEnd === null) return { open: true, lastOrders: fromMinutes(endNow) };
    const pausedMinutes = Math.ceil((pauseEnd - at.getTime()) / 60_000);
    if (minutes + pausedMinutes < endNow) {
      return { open: false, reason: "paused", resumeAt: formatClock(pauseEnd, settings.timezone), next: null };
    }
  }

  for (let offset = 0; offset <= 7; offset += 1) {
    const window = windowFor(offset);
    if (!window || (offset === 0 && minutes >= window.start)) continue;
    const day = WEEKDAYS[(dayIndex + offset) % 7];
    const when = offset === 0 ? "today" : offset === 1 ? "tomorrow" : dayLabel(day);
    return { open: false, reason: "closed", next: { when, time: fromMinutes(window.start) } };
  }
  return { open: false, reason: "closed", next: null };
}

export function closedMessage(status: Exclude<OrderingStatus, { open: true }>) {
  if (status.reason === "paused") {
    return `We're very busy — online ordering is paused for a few minutes. Back at ${status.resumeAt}.`;
  }
  if (status.reason === "closed" && status.next) {
    return `We're closed for online orders right now. We're next open ${status.next.when} at ${status.next.time}.`;
  }
  return "We're not taking online orders right now. Please check back soon.";
}
