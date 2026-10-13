import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { publicSupabase } from "@/lib/supabase-public";
import { parseOpeningHours } from "./hours";
import { formatPence, toPence } from "./money";
import type { MenuBox, OrderingSettings } from "./types";

export const MENU_TAG = "menu";
export const SETTINGS_TAG = "ordering-settings";

export const BOX_SELECT = `
  id, is_available, is_featured_item, display_order, price_override, name_override, description_override,
  active_menus!inner ( id, is_main, status ),
  menu_template_items!inner (
    id, slug, name, description, base_price, allergens, image_url, is_available, sold_out, display_order,
    menu_item_option_groups (
      id, name, is_required, min_selections, max_selections, display_order,
      menu_item_options ( id, name, price_adjustment, display_order, is_available )
    )
  )
`;

type OptionRow = { id: string; name: string; price_adjustment: number | string; display_order: number; is_available: boolean };
type GroupRow = {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  display_order: number;
  menu_item_options: OptionRow[];
};
export type BoxRow = {
  id: string;
  is_available: boolean;
  is_featured_item: boolean;
  display_order: number;
  price_override: number | string | null;
  name_override: string | null;
  description_override: string | null;
  active_menus: { id: string; is_main: boolean; status: string };
  menu_template_items: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    base_price: number | string;
    allergens: string | null;
    image_url: string | null;
    is_available: boolean;
    sold_out: boolean;
    display_order: number;
    menu_item_option_groups: GroupRow[];
  };
};

const byOrder = (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order;

export function mapBox(row: BoxRow): MenuBox {
  const item = row.menu_template_items;
  return {
    id: row.id,
    itemId: item.id,
    slug: item.slug,
    name: row.name_override ?? item.name,
    description: row.description_override ?? item.description,
    pricePence: toPence(row.price_override ?? item.base_price),
    allergens: item.allergens,
    imageUrl: item.image_url,
    soldOut: item.sold_out,
    featured: row.is_featured_item,
    groups: [...item.menu_item_option_groups].sort(byOrder).map((group) => ({
      id: group.id,
      name: group.name,
      required: group.is_required,
      min: group.min_selections,
      max: group.max_selections,
      options: [...group.menu_item_options].sort(byOrder).map((option) => ({
        id: option.id,
        name: option.name,
        pricePence: toPence(option.price_adjustment),
        available: option.is_available,
      })),
    })),
  };
}

/** All boxes on the main menu, including hidden ones when the client can see them (staff). */
export async function readMainMenuRows(client: SupabaseClient) {
  const { data, error } = await client
    .from("active_menu_items")
    .select(BOX_SELECT)
    .eq("active_menus.is_main", true)
    .order("display_order");
  if (error) throw error;
  return (data as unknown as BoxRow[]).sort(byOrder);
}

/** The public menu: cached, refreshed by updateTag(MENU_TAG) when staff edit it. Null if unavailable. */
export async function getMainMenu(): Promise<MenuBox[] | null> {
  "use cache";
  cacheTag(MENU_TAG);
  cacheLife("minutes");
  try {
    const rows = await readMainMenuRows(publicSupabase);
    return rows.map(mapBox);
  } catch (error) {
    console.error("[menu] Could not load the menu:", (error as { message?: string })?.message);
    return null;
  }
}

/** Live prices by box slug for the menu and home pages. Missing boxes keep their "£XX" placeholder. */
export async function boxPriceLabels(): Promise<Record<string, string>> {
  const boxes = await getMainMenu();
  return Object.fromEntries((boxes ?? []).map((box) => [box.slug, formatPence(box.pricePence)]));
}

const DEFAULT_SETTINGS: OrderingSettings = {
  acceptingOrders: false,
  openingHours: parseOpeningHours({}),
  leadMinutes: 20,
  timezone: "Europe/London",
  slotMinutes: 15,
  maxOrdersPerSlot: 6,
  daysAhead: 7,
  sameDayCutoffMinutes: 30,
  pausedUntil: null,
  pauseAllowsScheduled: true,
  readyEmailEnabled: true,
};

const SETTINGS_COLUMNS = `
  accepting_orders, opening_hours_json, collection_lead_minutes, timezone, slot_minutes, max_orders_per_slot,
  schedule_days_ahead, same_day_cutoff_minutes, paused_until, pause_allows_scheduled, ready_email_enabled
`;

const intOr = (value: unknown, fallback: number) => (Number.isInteger(Number(value)) && value !== null ? Number(value) : fallback);

export async function readOrderingSettings(client: SupabaseClient): Promise<OrderingSettings> {
  const { data, error } = await client.from("business_settings").select(SETTINGS_COLUMNS).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return {
    acceptingOrders: data.accepting_orders === true,
    openingHours: parseOpeningHours(data.opening_hours_json),
    leadMinutes: Number(data.collection_lead_minutes) || 20,
    timezone: typeof data.timezone === "string" ? data.timezone : "Europe/London",
    slotMinutes: intOr(data.slot_minutes, DEFAULT_SETTINGS.slotMinutes) || DEFAULT_SETTINGS.slotMinutes,
    maxOrdersPerSlot: intOr(data.max_orders_per_slot, DEFAULT_SETTINGS.maxOrdersPerSlot),
    daysAhead: intOr(data.schedule_days_ahead, DEFAULT_SETTINGS.daysAhead),
    sameDayCutoffMinutes: intOr(data.same_day_cutoff_minutes, DEFAULT_SETTINGS.sameDayCutoffMinutes),
    pausedUntil: typeof data.paused_until === "string" ? new Date(data.paused_until).toISOString() : null,
    pauseAllowsScheduled: data.pause_allows_scheduled !== false,
    readyEmailEnabled: data.ready_email_enabled !== false,
  };
}

/** Public ordering settings: cached, refreshed by updateTag(SETTINGS_TAG). Closed if unavailable. */
export async function getOrderingSettings(): Promise<OrderingSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("minutes");
  try {
    return await readOrderingSettings(publicSupabase);
  } catch (error) {
    console.error("[menu] Could not load ordering settings:", (error as { message?: string })?.message);
    return DEFAULT_SETTINGS;
  }
}
