import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase-server";
import { buildCancellationEmail, buildCustomerOrderEmail, buildReadyEmail, buildShopOrderEmail } from "./order-email";
import { readOrder, type OrderDetail } from "./orders";

// Every order email is sent once: a Resend idempotency key per order and kind, and a *_sent_at
// column so a retry (webhook redelivery, double tap) doesn't send it again.

const resend = new Resend(env.RESEND_API_KEY);

type SentColumn = "confirmation_email_sent_at" | "shop_email_sent_at" | "cancellation_email_sent_at" | "ready_email_sent_at";

function describe(error: unknown) {
  if (error && typeof error === "object") {
    const { name, message, statusCode } = error as Record<string, unknown>;
    return { name, message, statusCode };
  }
  return { message: String(error) };
}

async function sendOnce(
  order: OrderDetail,
  column: SentColumn,
  key: string,
  message: { to: string; replyTo: string; subject: string; html: string; text: string },
) {
  try {
    const { error } = await resend.emails.send(
      { from: env.ENQUIRY_FROM_EMAIL, ...message },
      { idempotencyKey: `${key}-${order.id}` },
    );
    if (error) throw error;
    await supabase.from("orders").update({ [column]: new Date().toISOString() }).eq("id", order.id);
    return true;
  } catch (error) {
    console.error(`[orders/email] ${key} for #${order.orderNumber} failed:`, describe(error));
    return false;
  }
}

async function loadWithFlags(orderId: string) {
  const [flags, order] = await Promise.all([
    supabase
      .from("orders")
      .select("confirmation_email_sent_at, shop_email_sent_at, cancellation_email_sent_at, ready_email_sent_at")
      .eq("id", orderId)
      .single(),
    readOrder(supabase, { id: orderId }),
  ]);
  if (flags.error || !order) return null;
  return { order, flags: flags.data as Record<SentColumn, string | null> };
}

/** Receipt to the customer and a backup copy to the shop, once the payment is confirmed. */
export async function sendOrderEmails(orderId: string) {
  const loaded = await loadWithFlags(orderId);
  if (!loaded) return;
  const { order, flags } = loaded;

  if (!flags.confirmation_email_sent_at) {
    const email = buildCustomerOrderEmail(order);
    await sendOnce(order, "confirmation_email_sent_at", "order-confirmation", {
      to: order.customerEmail,
      replyTo: env.ENQUIRY_TO_EMAIL,
      ...email,
    });
  }
  if (!flags.shop_email_sent_at) {
    const email = buildShopOrderEmail(order);
    await sendOnce(order, "shop_email_sent_at", "order-shop", {
      to: env.ENQUIRY_TO_EMAIL,
      replyTo: order.customerEmail,
      ...email,
    });
  }
}

/** Tells the customer their paid order was cancelled and refunded. Returns false if it couldn't be sent. */
export async function sendCancellationEmail(orderId: string) {
  const loaded = await loadWithFlags(orderId);
  if (!loaded) return false;
  const { order, flags } = loaded;
  if (order.orderStatus !== "cancelled" || !order.paymentConfirmedAt) return false;
  if (flags.cancellation_email_sent_at) return true;
  return sendOnce(order, "cancellation_email_sent_at", "order-cancelled", {
    to: order.customerEmail,
    replyTo: env.ENQUIRY_TO_EMAIL,
    ...buildCancellationEmail(order),
  });
}

/** "Ready for collection", when the kitchen marks the order ready. */
export async function sendReadyEmail(orderId: string) {
  const loaded = await loadWithFlags(orderId);
  if (!loaded) return false;
  const { order, flags } = loaded;
  if (order.orderStatus !== "ready_for_collection") return false;
  if (flags.ready_email_sent_at) return true;
  return sendOnce(order, "ready_email_sent_at", "order-ready", {
    to: order.customerEmail,
    replyTo: env.ENQUIRY_TO_EMAIL,
    ...buildReadyEmail(order),
  });
}
