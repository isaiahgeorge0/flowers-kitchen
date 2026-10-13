import { connection } from "next/server";
import { supabase } from "@/lib/supabase-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the confirmation page until the webhook has confirmed payment.
// The token is the order's unguessable public reference, so this reveals status only.
export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[token]">) {
  await connection();
  const { token } = await ctx.params;
  if (!UUID_RE.test(token)) return Response.json({ ok: false }, { status: 404 });

  const { data, error } = await supabase
    .from("orders")
    .select("payment_status, order_status")
    .eq("public_token", token)
    .maybeSingle();
  if (error) return Response.json({ ok: false }, { status: 503 });
  if (!data) return Response.json({ ok: false }, { status: 404 });

  return Response.json(
    { ok: true, paymentStatus: data.payment_status, orderStatus: data.order_status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
