"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdminForAction } from "@/lib/admin/guards";
import type { AdminActionState } from "@/lib/admin/types";
import { dayLabel, isTime, WEEKDAYS, type OpeningHours } from "@/lib/ordering/hours";
import { SLOT_MINUTE_OPTIONS } from "@/lib/ordering/limits";
import { readOrderingSettings, SETTINGS_TAG } from "@/lib/ordering/menu";

export type SwitchResult = { ok: true } | { ok: false; message: string };

const fail = (message: string, values?: Record<string, string>): AdminActionState => ({
  ok: false,
  message,
  at: Date.now(),
  values,
});
const success = (message: string): AdminActionState => ({ ok: true, message, at: Date.now() });

export async function setAcceptingOrdersAction(enabled: boolean): Promise<SwitchResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;
  const { adminUser, supabase } = auth.ctx;
  if (!adminUser.canManageOrders && !adminUser.canManageMenus) {
    return { ok: false, message: "You don't have access to ordering settings." };
  }

  const { data, error } = await supabase
    .from("business_settings")
    .update({ accepting_orders: enabled === true })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "We couldn't change that. Try again." };

  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true };
}

export async function setDailyResetAction(enabled: boolean): Promise<SwitchResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;
  if (!auth.ctx.adminUser.canManageMenus) {
    return { ok: false, message: "Only staff with menu access can change this." };
  }

  const { data, error } = await auth.ctx.supabase
    .from("business_settings")
    .update({ reset_sold_out_daily: enabled === true })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "We couldn't change that. Try again." };

  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true };
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

export async function saveOrderingHoursAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const typed: Record<string, string> = {};
  for (const day of WEEKDAYS) {
    typed[`${day}_enabled`] = formData.get(`${day}_enabled`) === "on" ? "on" : "";
    typed[`${day}_open`] = String(formData.get(`${day}_open`) ?? "").slice(0, 5);
    typed[`${day}_close`] = String(formData.get(`${day}_close`) ?? "").slice(0, 5);
  }
  const auth = await requireAdminForAction();
  if (!auth.ok) return fail(auth.message, typed);
  if (!auth.ctx.adminUser.canManageMenus) {
    return fail("Only staff with menu access can change opening hours.", typed);
  }

  let leadMinutes: number;
  try {
    leadMinutes = (await readOrderingSettings(auth.ctx.supabase)).leadMinutes;
  } catch {
    return fail("We couldn't save the hours. Try again.", typed);
  }

  const hours = {} as OpeningHours;
  for (const day of WEEKDAYS) {
    const enabled = typed[`${day}_enabled`] === "on";
    const open = typed[`${day}_open`];
    const close = typed[`${day}_close`];
    if (enabled) {
      if (!isTime(open) || !isTime(close)) return fail(`Add opening and closing times for ${dayLabel(day)}.`, typed);
      if (open === close) return fail(`${dayLabel(day)} opens and closes at the same time.`, typed);
      const length = (toMinutes(close) - toMinutes(open) + 24 * 60) % (24 * 60);
      if (length <= leadMinutes) {
        return fail(`${dayLabel(day)} is shorter than the ${leadMinutes}-minute ASAP time, so no orders could be taken.`, typed);
      }
    }
    hours[day] = { open: isTime(open) ? open : "00:00", close: isTime(close) ? close : "00:00", enabled };
  }

  const { data, error } = await auth.ctx.supabase
    .from("business_settings")
    .update({ opening_hours_json: hours })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return fail("We couldn't save the hours. Try again.", typed);

  updateTag(SETTINGS_TAG);
  refresh();
  return success("Opening hours saved.");
}

const COLLECTION_FIELDS = ["leadMinutes", "slotMinutes", "maxOrdersPerSlot", "daysAhead", "cutoffMinutes"] as const;

function wholeNumber(value: string, min: number, max: number) {
  const number = Number(value);
  return value.trim() !== "" && Number.isInteger(number) && number >= min && number <= max ? number : null;
}

export async function saveCollectionSettingsAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const typed: Record<string, string> = {};
  for (const field of COLLECTION_FIELDS) typed[field] = String(formData.get(field) ?? "").slice(0, 4);
  typed.pauseAllowsScheduled = formData.get("pauseAllowsScheduled") === "on" ? "on" : "";
  typed.readyEmailEnabled = formData.get("readyEmailEnabled") === "on" ? "on" : "";

  const auth = await requireAdminForAction();
  if (!auth.ok) return fail(auth.message, typed);
  if (!auth.ctx.adminUser.canManageMenus) {
    return fail("Only staff with menu access can change collection times.", typed);
  }

  const leadMinutes = wholeNumber(typed.leadMinutes, 5, 180);
  if (leadMinutes === null) return fail("Set the ASAP time between 5 and 180 minutes.", typed);
  const slotMinutes = wholeNumber(typed.slotMinutes, 10, 60);
  if (slotMinutes === null || !(SLOT_MINUTE_OPTIONS as readonly number[]).includes(slotMinutes)) {
    return fail("Choose a slot length from the list.", typed);
  }
  const maxOrdersPerSlot = wholeNumber(typed.maxOrdersPerSlot, 1, 100);
  if (maxOrdersPerSlot === null) return fail("Set the orders per slot between 1 and 100.", typed);
  const daysAhead = wholeNumber(typed.daysAhead, 0, 14);
  if (daysAhead === null) return fail("Set the days ahead between 0 and 14.", typed);
  const cutoffMinutes = wholeNumber(typed.cutoffMinutes, 0, 240);
  if (cutoffMinutes === null) return fail("Set the same-day cut-off between 0 and 240 minutes.", typed);

  let hours: OpeningHours;
  try {
    hours = (await readOrderingSettings(auth.ctx.supabase)).openingHours;
  } catch {
    return fail("We couldn't save the collection times. Try again.", typed);
  }
  for (const day of WEEKDAYS) {
    if (!hours[day].enabled) continue;
    const length = (toMinutes(hours[day].close) - toMinutes(hours[day].open) + 24 * 60) % (24 * 60) || 24 * 60;
    if (length <= leadMinutes) {
      return fail(`${dayLabel(day)} is shorter than ${leadMinutes} minutes, so no ASAP orders could be taken.`, typed);
    }
  }

  const { data, error } = await auth.ctx.supabase
    .from("business_settings")
    .update({
      collection_lead_minutes: leadMinutes,
      slot_minutes: slotMinutes,
      max_orders_per_slot: maxOrdersPerSlot,
      schedule_days_ahead: daysAhead,
      same_day_cutoff_minutes: cutoffMinutes,
      pause_allows_scheduled: typed.pauseAllowsScheduled === "on",
      ready_email_enabled: typed.readyEmailEnabled === "on",
    })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return fail("We couldn't save the collection times. Try again.", typed);

  updateTag(SETTINGS_TAG);
  refresh();
  return success("Collection times saved.");
}
