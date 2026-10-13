import { connection } from "next/server";
import { readOrderingSettings } from "@/lib/ordering/menu";
import { liveSchedule } from "@/lib/ordering/slot-capacity";
import { supabase } from "@/lib/supabase-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Collection days and slots for the checkout time picker, with full slots marked. Reveals only
// times and whether they're full, never orders. Checkout checks the chosen slot again.
export async function GET(request: Request) {
  await connection();
  const nonce = new URL(request.url).searchParams.get("nonce") ?? "";
  try {
    const settings = await readOrderingSettings(supabase);
    const days = await liveSchedule(settings, UUID_RE.test(nonce) ? nonce : undefined);
    return Response.json({ ok: true, days }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[order-slots] Could not load slots:", (error as { message?: string })?.message);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
