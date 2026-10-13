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
  // A 500 makes Stripe retry; the event ledger makes the retry safe.
  return Response.json({ ok: result.ok, duplicate: result.duplicate }, { status: result.ok ? 200 : 500 });
}
