"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdminForAction } from "@/lib/admin/guards";
import { BOX_LIMITS } from "@/lib/admin/menu-limits";
import { isUuid } from "@/lib/admin/orders";
import type { AdminActionState } from "@/lib/admin/types";
import { MENU_TAG } from "@/lib/ordering/menu";

export type ToggleResult = { ok: true } | { ok: false; message: string };

const MIN_PRICE = 0.5;
const MAX_PRICE = 500;

const fail = (message: string, values?: Record<string, string>): AdminActionState => ({
  ok: false,
  message,
  at: Date.now(),
  values,
});
const success = (message: string): AdminActionState => ({ ok: true, message, at: Date.now() });

/** Kitchen staff (orders) may flip sold-out and rice availability; menu staff may edit everything. */
async function menuAuth(level: "toggle" | "edit") {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;
  const { adminUser } = auth.ctx;
  const allowed = level === "edit" ? adminUser.canManageMenus : adminUser.canManageMenus || adminUser.canManageOrders;
  if (!allowed) return { ok: false as const, message: "You don't have access to change the menu." };
  return auth;
}

function menuChanged() {
  updateTag(MENU_TAG);
  refresh();
}

/** "£10.50", "10.5" or "10" → 10.5. */
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= MIN_PRICE && value <= MAX_PRICE ? value : null;
}

export async function saveBoxDetailsAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const typed = {
    name: String(formData.get("name") ?? "").slice(0, BOX_LIMITS.name + 20),
    description: String(formData.get("description") ?? "").replace(/\r\n/g, "\n").slice(0, BOX_LIMITS.description + 50),
    price: String(formData.get("price") ?? "").slice(0, 20),
    allergens: String(formData.get("allergens") ?? "").replace(/\r\n/g, "\n").slice(0, BOX_LIMITS.allergens + 50),
  };

  const auth = await menuAuth("edit");
  if (!auth.ok) return fail(auth.message, typed);
  if (!isUuid(id)) return fail("We couldn't find that box.", typed);

  const name = typed.name.trim().replace(/\s+/g, " ");
  const description = typed.description.trim();
  const allergens = typed.allergens.trim();
  const price = parsePrice(typed.price);

  if (!name) return fail("Give the box a name.", typed);
  if (name.length > BOX_LIMITS.name) return fail(`Names can be up to ${BOX_LIMITS.name} characters.`, typed);
  if (description.length > BOX_LIMITS.description) {
    return fail(`Descriptions can be up to ${BOX_LIMITS.description} characters.`, typed);
  }
  if (price === null) return fail(`Enter a price in pounds between £0.50 and £${MAX_PRICE}, like 12.50.`, typed);
  if (!allergens) return fail("List the allergens. Customers see them before they order.", typed);
  if (allergens.length > BOX_LIMITS.allergens) {
    return fail(`Allergens can be up to ${BOX_LIMITS.allergens} characters.`, typed);
  }

  const { data, error } = await auth.ctx.supabase
    .from("menu_template_items")
    .update({ name, description: description || null, base_price: price, allergens })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return fail("We couldn't save that box. Try again.", typed);

  menuChanged();
  return success(`${name} saved.`);
}

export async function setSoldOutAction(itemId: string, soldOut: boolean): Promise<ToggleResult> {
  const auth = await menuAuth("toggle");
  if (!auth.ok) return auth;
  if (!isUuid(itemId)) return { ok: false, message: "We couldn't find that box." };

  const { data, error } = await auth.ctx.supabase
    .from("menu_template_items")
    .update({ sold_out: soldOut === true })
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "We couldn't change that. Try again." };

  menuChanged();
  return { ok: true };
}

export async function setOptionAvailableAction(optionId: string, available: boolean): Promise<ToggleResult> {
  const auth = await menuAuth("toggle");
  if (!auth.ok) return auth;
  if (!isUuid(optionId)) return { ok: false, message: "We couldn't find that option." };
  const { supabase } = auth.ctx;

  if (!available) {
    const { data: option } = await supabase
      .from("menu_item_options")
      .select("option_group_id, menu_item_option_groups ( is_required )")
      .eq("id", optionId)
      .maybeSingle();
    if (!option) return { ok: false, message: "We couldn't find that option." };
    const group = option.menu_item_option_groups as unknown as { is_required: boolean } | null;
    if (group?.is_required) {
      const { count } = await supabase
        .from("menu_item_options")
        .select("id", { count: "exact", head: true })
        .eq("option_group_id", option.option_group_id)
        .eq("is_available", true)
        .neq("id", optionId);
      if (!count) {
        return { ok: false, message: "Keep at least one rice option on, or mark the box sold out instead." };
      }
    }
  }

  const { data, error } = await supabase
    .from("menu_item_options")
    .update({ is_available: available === true })
    .eq("id", optionId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "We couldn't change that. Try again." };

  menuChanged();
  return { ok: true };
}
