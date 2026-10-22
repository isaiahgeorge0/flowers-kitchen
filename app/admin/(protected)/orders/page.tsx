import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading, AdminPageHeader, NoAccess } from "@/components/admin/AdminUi";
import { KitchenBar } from "@/components/admin/kitchen/KitchenBar";
import { KitchenBoard } from "@/components/admin/kitchen/KitchenBoard";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { navAccess } from "@/lib/admin/nav";
import { fetchKitchenOrders } from "@/lib/admin/orders";
import { fetchSharedPanel } from "@/lib/admin/shared-items";
import { ROLE_LABELS } from "@/lib/admin/types";
import { readOrderingSettings } from "@/lib/ordering/menu";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div data-wide>
      <div className="group-has-[[data-kitchen]]/shell:max-[1440px]:sr-only">
        <AdminPageHeader eyebrow="Kitchen" title="Orders">
          Paid orders appear here as they come in. Keep this page open on the kitchen phone or tablet.
        </AdminPageHeader>
      </div>
      <Suspense fallback={<OrdersLoading />}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}

function OrdersLoading() {
  return (
    <div data-kitchen>
      <KitchenBar />
      <AdminLoading label="Loading orders…" />
    </div>
  );
}

async function OrdersContent() {
  const { supabase, user, adminUser } = await requireActiveAdmin();
  if (!adminUser.canManageOrders) return <NoAccess area="orders" />;

  const [{ orders, failed, fetchedAt }, settings, shared] = await Promise.all([
    fetchKitchenOrders(supabase),
    readOrderingSettings(supabase).catch(() => null),
    fetchSharedPanel(supabase).catch(() => null),
  ]);
  return (
    <>
      <KitchenBoard
        orders={orders}
        failed={failed}
        serverNow={fetchedAt}
        settings={{
          acceptingOrders: settings?.acceptingOrders ?? false,
          pausedUntil: settings?.pausedUntil ?? null,
          pauseAllowsScheduled: settings?.pauseAllowsScheduled ?? true,
        }}
        menu={{
          displayName: user.displayName ?? user.email ?? "Staff",
          roleLabel: ROLE_LABELS[adminUser.role],
          access: navAccess(adminUser),
          signOutSlot: <SignOutButton />,
        }}
        shared={shared}
      />
      <p className="mt-10 border-t border-hairline pt-6 text-[15px]">
        <Link href="/admin/orders/history" className="inline-flex min-h-11 items-center font-semibold underline decoration-sorrel underline-offset-4">
          Order history
        </Link><span className="text-muted">. Past orders, totals and CSV export.</span>
      </p>
    </>
  );
}
