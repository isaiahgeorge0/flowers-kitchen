import "server-only";
import { supabase } from "@/lib/supabase-server";

type ItemRow = {
  id: string;
  active_menu_items: {
    menu_template_items: {
      menu_item_components: { menu_components: { name: string; is_available: boolean; display_order: number } | null }[];
    } | null;
  } | null;
};

/**
 * Records which included sides were out when the order was paid, so the kitchen card and the
 * receipt stay right after the switch goes back on. Never throws: the payment has landed already.
 */
export async function snapshotMissingSides(orderId: string) {
  try {
    const { data, error } = await supabase
      .from("order_items")
      .select(
        "id, active_menu_items ( menu_template_items ( menu_item_components ( menu_components ( name, is_available, display_order ) ) ) )",
      )
      .eq("order_id", orderId);
    if (error) throw error;

    await Promise.all(
      (data as unknown as ItemRow[]).map((item) => {
        const links = item.active_menu_items?.menu_template_items?.menu_item_components ?? [];
        const missing = links
          .flatMap((link) => (link.menu_components && !link.menu_components.is_available ? [link.menu_components] : []))
          .sort((a, b) => a.display_order - b.display_order)
          .map((side) => side.name);
        return supabase
          .from("order_items")
          .update({ missing_sides: missing.length ? missing : null })
          .eq("id", item.id)
          .then(({ error: updateError }) => {
            if (updateError) throw updateError;
          });
      }),
    );
  } catch (error) {
    console.error("[orders] Could not record missing sides:", (error as { message?: string })?.message);
  }
}
