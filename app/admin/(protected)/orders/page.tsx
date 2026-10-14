import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading, AdminPageHeader, NoAccess } from "@/components/admin/AdminUi";
import { KitchenBoard } from "@/components/admin/kitchen/KitchenBoard";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { fetchKitchenOrders } from "@/lib/admin/orders";
import { readOrderingSettings } from "@/lib/ordering/menu";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div data-wide>
      <AdminPageHeader eyebrow="Kitchen" title="Orders">
        Paid orders appear here as they come in. Keep this page open on the kitchen phone or tablet.
      </AdminPageHeader>
      <Suspense fallback={<AdminLoading label="Loading orders…" />}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}

async function OrdersContent() {
  const { supabase, adminUser } = await requireActiveAdmin();
  if (!adminUser.canManageOrders) return <NoAccess area="orders" />;

  const [{ orders, failed, fetchedAt }, settings] = await Promise.all([
    fetchKitchenOrders(supabase),
    readOrderingSettings(supabase).catch(() => null),
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
      />
      <p className="mt-10 border-t border-hairline pt-6 text-[15px]">
        <Link href="/admin/orders/history" className="inline-flex min-h-11 items-center font-semibold underline decoration-sorrel underline-offset-4">
          Order history
        </Link>
        <span className="text-muted"> — past orders, totals and CSV export.</span>
      </p>
    </>
  );
}
