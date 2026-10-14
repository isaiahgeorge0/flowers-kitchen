import { stripeEnv } from "@/lib/env";
import { processStripeWebhookEvent } from "@/lib/ordering/stripe-webhook";
import { getStripe } from "@/lib/stripe";

// Payment truth: orders become paid only here, after Stripe's signature is verified.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ ok: false, error: "Missing Stripe signature." }, { status: 400 });

  const rawBody = await request.text();

  let webhookSecret: string;
  try {
    webhookSecret = stripeEnv().webhookSecret;
  } catch (error) {
    console.error("[stripe/webhook] Not configured:", (error as Error).message);
    return Response.json({ ok: false, error: "Webhook endpoint is not configured." }, { status: 503 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return Response.json({ ok: false, error: "Invalid Stripe signature." }, { status: 400 });
  }

  const result = await processStripeWebhookEvent(event);
  // 500 only for real failures (Supabase, Stripe API): Stripe retries, and the event ledger makes
  // the retry safe. Events that aren't for a site order come back ok with `ignored` set.
  if (!result.ok) return Response.json({ ok: false, duplicate: result.duplicate }, { status: 500 });
  return Response.json({ ok: true, duplicate: result.duplicate, ignored: result.ignored ?? null });
}
