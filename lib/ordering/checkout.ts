import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { stripeEnv } from "@/lib/env";
import { clientIp, hit, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase-server";
import { cleanCustomer, validateCustomer, type CustomerErrors, type CustomerValues } from "./customer";
import { closedMessage, orderingStatus } from "./hours";
import { COLLECTION_ADDRESS } from "./limits";
import { readOrderingSettings } from "./menu";
import { toPounds } from "./money";
import { cartInputSchema, priceCart } from "./pricing";
import { canSchedule, findSlot, formatCollectionLong } from "./schedule";
import { liveSchedule } from "./slot-capacity";
import type { CartLine, OrderSource } from "./types";

// A Checkout Session stays payable for this long; Stripe's minimum is 30 minutes.
const SESSION_MINUTES = 31;
// Per IP and per phone number: enough for a customer fixing a mistake, not for a script.
const CHECKOUT_LIMIT = { limit: 5, windowMinutes: 10 };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StartCheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: CustomerErrors;
      cart?: CartLine[];
      /** The chosen collection time is no longer available; the picker should reload. */
      slotsChanged?: boolean;
    };

const FAILED = "We couldn't start your payment. Please try again in a moment.";

function describe(error: unknown) {
  if (error && typeof error === "object") {
    const { name, message, code, type } = error as Record<string, unknown>;
    return { name, message, code, type };
  }
  return { message: String(error) };
}

/**
 * Earlier unpaid attempts from the same checkout visit: close their Stripe sessions so an old
 * tab can't be paid as well, and cancel those orders.
 */
async function closeEarlierAttempts(nonce: string, keepId?: string) {
  const { data } = await supabase
    .from("orders")
    .select("id, stripe_checkout_session_id")
    .like("checkout_idempotency_key", `${nonce}:%`)
    .eq("order_status", "pending")
    .eq("payment_status", "unpaid");

  for (const order of data ?? []) {
    if (order.id === keepId) continue;
    let closed = !order.stripe_checkout_session_id;
    if (order.stripe_checkout_session_id) {
      try {
        await getStripe().checkout.sessions.expire(order.stripe_checkout_session_id);
        closed = true;
      } catch {
        const session = await getStripe()
          .checkout.sessions.retrieve(order.stripe_checkout_session_id)
          .catch(() => null);
        closed = session?.status === "expired";
      }
    }
    if (closed) {
      await supabase
        .from("orders")
        .update({ order_status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Replaced by a newer checkout" })
        .eq("id", order.id)
        .eq("payment_status", "unpaid");
    }
  }
}

export async function startCheckout(input: {
  cart: unknown;
  expectedTotalPence: number;
  nonce: string;
  customer: CustomerValues;
  collection: { type: string; slot: string };
  source: string;
}): Promise<StartCheckoutResult> {
  const source: OrderSource = input.source === "qr" ? "qr" : "web";
  if (input.collection.type !== "asap" && input.collection.type !== "scheduled") {
    return { ok: false, message: "Choose when you'd like to collect." };
  }
  if (input.collection.type === "scheduled" && !input.collection.slot) {
    return { ok: false, message: "Choose a collection time." };
  }
  const fieldErrors = validateCustomer(input.customer);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Please check your details.", fieldErrors };
  }
  const customer = cleanCustomer(input.customer);

  const cart = cartInputSchema.safeParse(input.cart);
  if (!cart.success || !UUID_RE.test(input.nonce)) {
    return { ok: false, message: "We couldn't read your basket. Please add your boxes again." };
  }

  const limits: [bucket: string, key: string][] = [
    ["checkout-ip", await clientIp()],
    ["checkout-phone", customer.phone],
  ];
  for (const [bucket, key] of limits) {
    const limited = await hit(bucket, key, CHECKOUT_LIMIT.limit, CHECKOUT_LIMIT.windowMinutes);
    if (!limited.ok) return { ok: false, message: RATE_LIMITED_MESSAGE };
  }

  let settings;
  let priced;
  let scheduledFor: string | null = null;
  try {
    settings = await readOrderingSettings(supabase);
    if (input.collection.type === "asap") {
      const status = orderingStatus(settings);
      if (!status.open) {
        const later = canSchedule(settings) ? " You can still choose a later collection time." : "";
        return { ok: false, message: `${closedMessage(status)}${later}` };
      }
    } else {
      const days = await liveSchedule(settings, input.nonce);
      const found = findSlot(days, input.collection.slot);
      if (!found) {
        return {
          ok: false,
          message: "That collection time isn't available any more. Please choose another.",
          slotsChanged: true,
        };
      }
      if (found.slot.full) {
        return { ok: false, message: "That time has just filled up. Please choose another.", slotsChanged: true };
      }
      scheduledFor = found.slot.start;
    }
    priced = await priceCart(cart.data);
  } catch (error) {
    console.error("[checkout] Could not check the basket:", describe(error));
    return { ok: false, message: FAILED };
  }
  if (!priced.ok) return { ok: false, message: priced.message };

  // Never charge a different amount from the one the customer saw on the Pay button.
  if (priced.totalPence !== input.expectedTotalPence) {
    return {
      ok: false,
      message: "Prices have changed since you added your boxes. Please check your basket and try again.",
      cart: priced.cart,
    };
  }

  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        lines: priced.lines.map((line) => [line.boxId, line.options.map((option) => option.optionId), line.quantity]),
        customer,
        total: priced.totalPence,
        collection: scheduledFor ?? "asap",
        source,
      }),
    )
    .digest("hex")
    .slice(0, 32);
  const keyPrefix = `${input.nonce}:${fingerprint}:`;

  try {
    // Same basket, same details, session still open (double tap or back button): reuse it.
    const reusable = await supabase
      .from("orders")
      .select("id, stripe_session_url")
      .like("checkout_idempotency_key", `${keyPrefix}%`)
      .eq("order_status", "pending")
      .eq("payment_status", "unpaid")
      .gt("stripe_session_expires_at", new Date(Date.now() + 5 * 60_000).toISOString())
      .not("stripe_session_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reusable.data?.stripe_session_url) {
      await closeEarlierAttempts(input.nonce, reusable.data.id);
      return { ok: true, url: reusable.data.stripe_session_url };
    }
    await closeEarlierAttempts(input.nonce);
  } catch (error) {
    console.error("[checkout] Could not check earlier attempts:", describe(error));
  }

  const orderId = randomUUID();
  const total = toPounds(priced.totalPence);

  const inserted = await supabase
    .from("orders")
    .insert({
      id: orderId,
      active_menu_id: priced.menuId,
      subtotal_amount: total,
      total_amount: total,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      special_instructions: customer.note || null,
      collection_lead_minutes: settings.leadMinutes,
      collection_type: scheduledFor ? "scheduled" : "asap",
      scheduled_for: scheduledFor,
      source,
      checkout_idempotency_key: `${keyPrefix}${randomUUID().slice(0, 8)}`,
      payment_provider: "stripe",
    })
    .select("order_number, public_token")
    .single();
  if (inserted.error) {
    console.error("[checkout] Could not save the order:", describe(inserted.error));
    return { ok: false, message: FAILED };
  }
  const { order_number: orderNumber, public_token: publicToken } = inserted.data;

  const items = priced.lines.map((line) => ({ id: randomUUID(), line }));
  let sessionId: string | null = null;
  try {
    const itemsResult = await supabase.from("order_items").insert(
      items.map(({ id, line }) => ({
        id,
        order_id: orderId,
        source_active_menu_item_id: line.boxId,
        item_name_snapshot: line.name,
        unit_price_snapshot: toPounds(line.basePence),
        options_unit_total_snapshot: toPounds(line.optionsPence),
        quantity: line.quantity,
        line_total: toPounds(line.lineTotalPence),
      })),
    );
    if (itemsResult.error) throw itemsResult.error;

    const optionRows = items.flatMap(({ id, line }) =>
      line.options.map((option) => ({
        order_item_id: id,
        option_group_id: option.groupId,
        option_id: option.optionId,
        group_name_snapshot: option.groupName,
        option_name_snapshot: option.optionName,
        price_adjustment_snapshot: toPounds(option.pricePence),
      })),
    );
    if (optionRows.length > 0) {
      const optionsResult = await supabase.from("order_item_options").insert(optionRows);
      if (optionsResult.error) throw optionsResult.error;
    }

    const { siteUrl } = stripeEnv();
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        // Card covers Apple Pay and Google Pay.
        allowed_payment_method_types: ["card"],
        currency: "gbp",
        locale: "en-GB",
        submit_type: "pay",
        customer_email: customer.email,
        client_reference_id: orderId,
        line_items: priced.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "gbp",
            unit_amount: line.unitPence,
            product_data: {
              name: `${line.name} box`,
              ...(line.options.length > 0 && {
                description: line.options.map((option) => option.optionName).join(", "),
              }),
            },
          },
        })),
        metadata: { order_id: orderId, order_number: String(orderNumber) },
        custom_text: {
          submit: {
            message: scheduledFor
              ? `Collection: ${formatCollectionLong(scheduledFor, settings.timezone)}, ${COLLECTION_ADDRESS}.`
              : `Collection: as soon as possible, ready in about ${settings.leadMinutes} minutes, ${COLLECTION_ADDRESS}.`,
          },
        },
        payment_intent_data: {
          description: `Flowers Kitchen order #${orderNumber}`,
          metadata: { order_id: orderId, order_number: String(orderNumber) },
        },
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
        success_url: `${siteUrl}/order/confirmation/${publicToken}`,
        cancel_url: `${siteUrl}/order/checkout`,
      },
      { idempotencyKey: `checkout-session-${orderId}` },
    );
    sessionId = session.id;
    if (!session.url) throw new Error("Stripe returned no checkout URL");

    const saved = await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_session_url: session.url,
        stripe_session_expires_at: new Date(session.expires_at * 1000).toISOString(),
      })
      .eq("id", orderId);
    if (saved.error) throw saved.error;

    return { ok: true, url: session.url };
  } catch (error) {
    console.error(`[checkout] Could not start payment for order ${orderNumber}:`, describe(error));
    if (sessionId) {
      // Leave the order in place if the session can't be closed, so a payment still finds it.
      const expired = await getStripe()
        .checkout.sessions.expire(sessionId)
        .then(() => true)
        .catch(() => false);
      if (!expired) return { ok: false, message: FAILED };
    }
    await supabase.from("orders").delete().eq("id", orderId).eq("payment_status", "unpaid");
    return { ok: false, message: FAILED };
  }
}
