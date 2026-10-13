import { connection } from "next/server";
import { requireAdminForAction } from "@/lib/admin/guards";
import { fetchOrderHistory, ordersCsv, parseHistoryFilters } from "@/lib/admin/order-history";

const EXPORT_LIMIT = 10_000;

// CSV of the order history with the same filters as the page.
export async function GET(request: Request) {
  await connection();
  const auth = await requireAdminForAction();
  if (!auth.ok) return new Response("Not signed in", { status: 401 });
  if (!auth.ctx.adminUser.canManageOrders) return new Response("No access to orders", { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = parseHistoryFilters(params);
  const { orders, failed } = await fetchOrderHistory(auth.ctx.supabase, filters, EXPORT_LIMIT);
  if (failed) return new Response("We couldn't load the orders. Try again.", { status: 503 });

  return new Response(ordersCsv(orders), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowers-kitchen-orders-${filters.from}-to-${filters.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
