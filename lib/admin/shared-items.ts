import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readMainMenuRows, type BoxRow } from "@/lib/ordering/menu";

export type SharedItemKind = "choice" | "included";
export type PanelItem = { id: string; name: string; kind: SharedItemKind; available: boolean };

/** Enough of each box on sale to say which ones a switch would sell out. */
export type PanelBox = {
  name: string;
  groups: { name: string; options: { componentId: string | null; available: boolean }[] }[];
};

export type SharedPanelData = { items: PanelItem[]; boxes: PanelBox[] };

export async function readSharedItems(client: SupabaseClient): Promise<PanelItem[]> {
  const { data, error } = await client
    .from("menu_components")
    .select("id, name, kind, is_available, display_order")
    .order("display_order")
    .order("name");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    kind: row.kind === "choice" ? "choice" : "included",
    available: row.is_available === true,
  }));
}

/** Boxes on sale (not hidden, not ticked sold out) with their required choices. */
export function panelBoxes(rows: BoxRow[]): PanelBox[] {
  return rows
    .filter((row) => row.is_available && row.menu_template_items.is_available && !row.menu_template_items.sold_out)
    .map((row) => ({
      name: row.name_override ?? row.menu_template_items.name,
      groups: row.menu_template_items.menu_item_option_groups
        .filter((group) => group.is_required || group.min_selections > 0)
        .map((group) => ({
          name: group.name,
          options: group.menu_item_options.map((option) => ({
            componentId: option.menu_components?.id ?? null,
            available: option.is_available,
          })),
        })),
    }));
}

export async function fetchSharedPanel(client: SupabaseClient, rows?: BoxRow[]): Promise<SharedPanelData> {
  const [items, menuRows] = await Promise.all([readSharedItems(client), rows ?? readMainMenuRows(client)]);
  return { items, boxes: panelBoxes(menuRows) };
}

/** Dashboard reminder: shared items switched off and boxes marked sold out. Null if it can't load. */
export async function fetchOutToday(client: SupabaseClient) {
  try {
    const [items, boxes] = await Promise.all([
      readSharedItems(client),
      client.from("menu_template_items").select("name, display_order").eq("sold_out", true).eq("is_available", true).order("display_order"),
    ]);
    if (boxes.error) throw boxes.error;
    return {
      items: items.filter((item) => !item.available).map((item) => item.name),
      boxes: boxes.data.map((box) => box.name as string),
    };
  } catch {
    return null;
  }
}
