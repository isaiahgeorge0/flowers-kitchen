import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, AdminPageHeader, adminCard, adminH2 } from "@/components/admin/AdminUi";
import { MenuEditor, type EditableBox } from "@/components/admin/MenuEditor";
import { SharedIngredients } from "@/components/admin/SharedIngredients";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { fetchSharedPanel, type SharedPanelData } from "@/lib/admin/shared-items";
import { readMainMenuRows, readOrderingSettings } from "@/lib/ordering/menu";
import { toPence } from "@/lib/ordering/money";

export const metadata: Metadata = { title: "Menu" };

export default function MenuPage() {
  return (
    <>
      <AdminPageHeader eyebrow="Ordering" title="Menu">
        Changes show on the website within a few seconds. Mark a box sold out when it runs out, and bring it back
        when it&rsquo;s ready again.
      </AdminPageHeader>
      <Suspense fallback={<AdminLoading label="Loading the menu…" />}>
        <MenuContent />
      </Suspense>
    </>
  );
}

async function MenuContent() {
  const { supabase, adminUser } = await requireActiveAdmin();
  if (!adminUser.canManageMenus && !adminUser.canManageOrders) {
    return (
      <p className={`${adminCard} px-6 py-10 text-center text-muted`}>
        Your account doesn&rsquo;t have access to the menu. Ask the owner if you need it.
      </p>
    );
  }

  let rows;
  let shared: SharedPanelData;
  let dailyReset: boolean;
  try {
    rows = await readMainMenuRows(supabase);
    [shared, { resetSoldOutDaily: dailyReset }] = await Promise.all([
      fetchSharedPanel(supabase, rows),
      readOrderingSettings(supabase),
    ]);
  } catch {
    return (
      <p role="alert" className={`${adminCard} px-6 py-10 text-center text-sorrel`}>
        We couldn&rsquo;t load the menu. Refresh to try again.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className={`${adminCard} px-6 py-10 text-center text-muted`}>
        The menu is empty. Run the menu seed in Supabase to add the boxes.
      </p>
    );
  }

  const includedSides = shared.items.filter((side) => side.kind === "included");
  const boxes: EditableBox[] = rows.map((row) => {
    const item = row.menu_template_items;
    const linked = new Set(item.menu_item_components.map((link) => link.menu_components?.id));
    return {
      itemId: item.id,
      name: item.name,
      description: item.description ?? "",
      price: (toPence(item.base_price) / 100).toFixed(2),
      allergens: item.allergens ?? "",
      soldOut: item.sold_out,
      hidden: !row.is_available || !item.is_available,
      groups: [...item.menu_item_option_groups]
        .sort((a, b) => a.display_order - b.display_order)
        .map((group) => ({
          id: group.id,
          name: group.name,
          options: [...group.menu_item_options]
            .sort((a, b) => a.display_order - b.display_order)
            .map((option) => ({
              id: option.id,
              name: option.name,
              available: option.is_available,
              sharedOut: option.menu_components?.is_available === false,
            })),
        })),
      sides: includedSides.map((side) => ({ id: side.id, name: side.name, included: linked.has(side.id) })),
    };
  });

  return (
    <>
      <section aria-labelledby="shared-heading" className={`${adminCard} mb-10 p-5 md:p-6`}>
        <h2 id="shared-heading" className={adminH2}>
          Shared ingredients
        </h2>
        <p className="mt-1 mb-6 max-w-2xl text-[15px] text-muted">
          One switch for every box.{" "}
          {dailyReset
            ? "Anything switched off, and any box marked sold out, goes back on at 4am."
            : "Switches stay as they are until you change them."}
        </p>
        <SharedIngredients data={shared} />
      </section>

      {!adminUser.canManageMenus && (
        <p className="mb-6 text-muted">You can mark boxes and shared ingredients sold out. Ask the owner to change names or prices.</p>
      )}
      <MenuEditor boxes={boxes} canEdit={adminUser.canManageMenus} />
    </>
  );
}
