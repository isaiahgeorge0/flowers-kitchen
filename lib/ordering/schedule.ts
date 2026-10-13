// Scheduled collection: which days and slots a customer can choose. Pure, so the browser can
// show availability and the server can recheck it with live order counts at checkout and again
// when the payment lands.
//
// Rules (also in CONTENT_TODO.md for the owners to confirm):
// - Slots sit on a grid of `slotMinutes` from midnight. The first starts once the kitchen has had
//   the lead time after opening; the last ends at closing.
// - Today: only slots at least the lead time from now, and none once we're within
//   `sameDayCutoffMinutes` of closing.
// - Paused: slots before the pause end plus the lead time are unavailable; all of them are when
//   `pauseAllowsScheduled` is off.
// - A slot is full once `maxOrdersPerSlot` paid (or still being paid for) orders fall inside it.
// - Days follow the opening day; a session running past midnight belongs to the day it opened.

import { activePauseEnd, formatClock, hasOpeningHours, openingWindow, WEEKDAYS, type Weekday } from "./hours";
import type { OrderingSettings } from "./types";

export type Slot = {
  /** ISO start time; what checkout sends and orders.scheduled_for stores. */
  start: string;
  /** "18:30" in the shop's time zone. */
  time: string;
  full: boolean;
};

export type ScheduleDay = {
  /** YYYY-MM-DD in the shop's time zone. */
  date: string;
  /** "Today", "Tomorrow" or "Thu 15 Oct". */
  label: string;
  /** "closed": not open that day. "none": open, but no times left (past the cutoff, or paused). */
  status: "open" | "closed" | "none";
  slots: Slot[];
};

type ScheduleSettings = Pick<
  OrderingSettings,
  | "acceptingOrders"
  | "openingHours"
  | "leadMinutes"
  | "timezone"
  | "slotMinutes"
  | "maxOrdersPerSlot"
  | "daysAhead"
  | "sameDayCutoffMinutes"
  | "pausedUntil"
  | "pauseAllowsScheduled"
>;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let value = formatters.get(key);
  if (!value) {
    value = new Intl.DateTimeFormat("en-GB", { timeZone, ...options });
    formatters.set(key, value);
  }
  return value;
}

/** Calendar date of `at` in `timeZone`. */
function zonedDate(at: Date, timeZone: string) {
  const parts = formatter(timeZone, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Offset of `timeZone` from UTC at an instant, in ms. */
function offsetAt(epoch: number, timeZone: string) {
  const parts = formatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epoch));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wall - Math.floor(epoch / 1000) * 1000;
}

/** The instant a wall-clock time (minutes after midnight, may exceed 24h) happens in `timeZone`. */
function zonedInstant(date: { year: number; month: number; day: number }, minutes: number, timeZone: string) {
  const wall = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  let epoch = wall - offsetAt(wall, timeZone);
  const corrected = wall - offsetAt(epoch, timeZone);
  if (corrected !== epoch) epoch = corrected;
  return epoch;
}

function addDays(date: { year: number; month: number; day: number }, days: number) {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    weekday: WEEKDAYS[(utc.getUTCDay() + 6) % 7] as Weekday,
    iso: utc.toISOString().slice(0, 10),
  };
}

export function dayName(isoDate: string) {
  return formatter("UTC", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${isoDate}T12:00:00Z`));
}

/**
 * Collection days from today to `daysAhead`, each with its bookable slots. `taken` holds the
 * scheduled_for times of orders that count against capacity.
 */
export function buildSchedule(settings: ScheduleSettings, at: Date = new Date(), taken: number[] = []): ScheduleDay[] {
  if (!settings.acceptingOrders || !hasOpeningHours(settings.openingHours)) return [];

  const tz = settings.timezone;
  const slotMs = settings.slotMinutes * 60_000;
  const pauseEnd = activePauseEnd(settings.pausedUntil, at);
  const blockedByPause = pauseEnd !== null && !settings.pauseAllowsScheduled;
  const earliest = Math.max(at.getTime(), pauseEnd ?? 0) + settings.leadMinutes * 60_000;
  const today = zonedDate(at, tz);

  const days: ScheduleDay[] = [];
  for (let offset = 0; offset <= settings.daysAhead; offset += 1) {
    const date = addDays(today, offset);
    const label = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : dayName(date.iso);
    const window = openingWindow(settings.openingHours[date.weekday]);
    if (!window) {
      days.push({ date: date.iso, label, status: "closed", slots: [] });
      continue;
    }

    const closeAt = zonedInstant(date, window.close, tz);
    const pastCutoff = offset === 0 && at.getTime() >= closeAt - settings.sameDayCutoffMinutes * 60_000;
    const slots: Slot[] = [];
    if (!blockedByPause && !pastCutoff) {
      const first = Math.ceil((window.open + settings.leadMinutes) / settings.slotMinutes) * settings.slotMinutes;
      for (let minutes = first; minutes + settings.slotMinutes <= window.close; minutes += settings.slotMinutes) {
        const start = zonedInstant(date, minutes, tz);
        if (start < earliest) continue;
        const count = taken.reduce((sum, time) => (time >= start && time < start + slotMs ? sum + 1 : sum), 0);
        slots.push({
          start: new Date(start).toISOString(),
          time: formatClock(start, tz),
          full: count >= settings.maxOrdersPerSlot,
        });
      }
    }
    days.push({ date: date.iso, label, status: slots.length > 0 ? "open" : "none", slots });
  }
  return days;
}

/** True when at least one slot exists, ignoring capacity (which only the server knows). */
export function canSchedule(settings: ScheduleSettings, at: Date = new Date()) {
  return buildSchedule(settings, at).some((day) => day.slots.length > 0);
}

export function findSlot(days: ScheduleDay[], start: string) {
  const target = Date.parse(start);
  if (!Number.isFinite(target)) return null;
  for (const day of days) {
    const slot = day.slots.find((candidate) => Date.parse(candidate.start) === target);
    if (slot) return { day, slot };
  }
  return null;
}

/** Earliest and latest instants the schedule can contain, for loading order counts. */
export function scheduleRange(settings: Pick<ScheduleSettings, "daysAhead">, at: Date = new Date()) {
  return { from: at.toISOString(), to: new Date(at.getTime() + (settings.daysAhead + 2) * 86_400_000).toISOString() };
}

/** "Today, 18:30", "Tomorrow, 12:45" or "Thu 15 Oct, 18:30". */
export function formatCollectionTime(iso: string, timeZone = "Europe/London", at: Date = new Date()) {
  const target = new Date(iso);
  const day = zonedDate(target, timeZone);
  const today = zonedDate(at, timeZone);
  const diff = Math.round(
    (Date.UTC(day.year, day.month - 1, day.day) - Date.UTC(today.year, today.month - 1, today.day)) / 86_400_000,
  );
  const time = formatClock(iso, timeZone);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  const iso10 = `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
  return `${dayName(iso10)}, ${time}`;
}

/** "Thursday 15 October at 18:30", for emails that may be read on another day. */
export function formatCollectionLong(iso: string, timeZone = "Europe/London") {
  const date = formatter(timeZone, { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
  return `${date} at ${formatClock(iso, timeZone)}`;
}

/** YYYY-MM-DD of an instant in the shop's time zone. */
export function zonedIsoDate(iso: string | number, timeZone = "Europe/London") {
  const day = zonedDate(new Date(iso), timeZone);
  return `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
}
