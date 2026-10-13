import { connection } from "next/server";
import { requireAdminForAction } from "@/lib/admin/guards";
import { orderQrCodeSvg, orderQrSvg } from "@/lib/qr/order-qr";

// Print-ready SVG of the counter QR code. ?plain=1 gives the bare code for previews.
export async function GET(request: Request) {
  await connection();
  const auth = await requireAdminForAction();
  if (!auth.ok) return new Response("Not signed in", { status: 401 });

  const params = new URL(request.url).searchParams;
  const plain = params.get("plain") === "1";
  const svg = plain ? await orderQrCodeSvg() : await orderQrSvg();
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...(params.get("download") === "1" && {
        "Content-Disposition": 'attachment; filename="flowers-kitchen-scan-to-order.svg"',
      }),
    },
  });
}
