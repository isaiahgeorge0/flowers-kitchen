import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, AdminPageHeader, adminCard } from "@/components/admin/AdminUi";
import { MenuEditor, type EditableBox } from "@/components/admin/MenuEditor";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { readMainMenuRows } from "@/lib/ordering/menu";
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
  try {
    rows = await readMainMenuRows(supabase);
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

  const boxes: EditableBox[] = rows.map((row) => {
    const item = row.menu_template_items;
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
            .map((option) => ({ id: option.id, name: option.name, available: option.is_available })),
        })),
    };
  });

  return (
    <>
      {!adminUser.canManageMenus && (
        <p className="mb-6 text-muted">You can mark boxes and rice sold out. Ask the owner to change names or prices.</p>
      )}
      <MenuEditor boxes={boxes} canEdit={adminUser.canManageMenus} />
    </>
  );
}
