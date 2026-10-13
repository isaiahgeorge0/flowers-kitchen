import { connection } from "next/server";
import { requireAdminForAction } from "@/lib/admin/guards";
import { orderQrPng } from "@/lib/qr/order-qr";

// High-resolution PNG (3000 px wide, 300 dpi) of the counter QR code.
export async function GET() {
  await connection();
  const auth = await requireAdminForAction();
  if (!auth.ok) return new Response("Not signed in", { status: 401 });

  const png = await orderQrPng();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="flowers-kitchen-scan-to-order.png"',
    },
  });
}
