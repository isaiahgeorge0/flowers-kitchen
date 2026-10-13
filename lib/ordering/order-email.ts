import "server-only";
import { shopPhone } from "@/lib/site";
import { COLLECTION_ADDRESS } from "./limits";
import { formatPence } from "./money";
import { formatClock, type OrderDetail } from "./orders";
import { formatCollectionLong } from "./schedule";

// Brand tokens from .cursor/rules/brand.mdc. Email clients need inline styles.
const C = {
  cream: "#F3EADB",
  paper: "#FBF6EE",
  pimento: "#2B1B16",
  muted: "#6E5B4F",
  sorrel: "#8F1D2C",
  hairline: "#D9CBB4",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function readyText(order: OrderDetail) {
  if (order.scheduledFor) return formatCollectionLong(order.scheduledFor);
  return order.estimatedReadyAt ? `about ${formatClock(order.estimatedReadyAt)}` : `in about ${order.leadMinutes} minutes`;
}

const contactHtml = () =>
  shopPhone
    ? `Questions? Reply to this email or call us on <a href="tel:${escapeHtml(shopPhone.replace(/\s/g, ""))}" style="color:${C.sorrel};">${escapeHtml(shopPhone)}</a>.`
    : "Questions? Just reply to this email.";
const contactText = () => (shopPhone ? `Questions? Reply to this email or call us on ${shopPhone}.` : "Questions? Just reply to this email.");

function itemsTable(order: OrderDetail) {
  const cell = `padding:12px 0;border-bottom:1px solid ${C.hairline};vertical-align:top;font-family:${SANS};font-size:15px;line-height:1.5;color:${C.pimento};`;
  const rows = order.items
    .map(
      (item) => `<tr>
        <td style="${cell}">${item.quantity} × ${escapeHtml(item.name)} box${
          item.options.length
            ? `<br><span style="color:${C.muted};font-size:14px;">${escapeHtml(item.options.join(", "))}</span>`
            : ""
        }</td>
        <td align="right" style="${cell}white-space:nowrap;padding-left:16px;">${formatPence(item.lineTotalPence)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.hairline};">
    ${rows}
    <tr>
      <td style="padding:14px 0 0;font-family:${SANS};font-size:15px;font-weight:600;color:${C.pimento};">Total paid</td>
      <td align="right" style="padding:14px 0 0;font-family:${SERIF};font-size:20px;font-weight:600;color:${C.sorrel};">${formatPence(order.totalPence)}</td>
    </tr>
  </table>`;
}

function layout({ title, eyebrow, heading, intro, body, footer }: Record<string, string>) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};color:${C.pimento};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.paper};border:1px solid ${C.hairline};border-radius:2px;">
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;color:${C.sorrel};">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:12px 0 0;font-family:${SERIF};font-size:28px;font-weight:600;line-height:1.15;color:${C.pimento};">${heading}</h1>
            ${intro}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px;">${body}</td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.muted};">${footer}</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const para = (html: string, extra = "") =>
  `<p style="margin:12px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.pimento};${extra}">${html}</p>`;

export function buildCustomerOrderEmail(order: OrderDetail) {
  const firstName = order.customerName.split(" ")[0] ?? order.customerName;
  const subject = `Your Flowers Kitchen order #${order.orderNumber}`;
  const ready = readyText(order);

  const lead = order.scheduledFor
    ? `We've got your order. It will be ready to collect on <strong>${escapeHtml(ready)}</strong>.`
    : `We've got your order and we're cooking. It will be ready to collect at <strong>${escapeHtml(ready)}</strong>.`;

  const html = layout({
    title: subject,
    eyebrow: `Order #${order.orderNumber}`,
    heading: `Thank you, ${escapeHtml(firstName)}`,
    intro:
      para(lead) +
      para(`Collect from ${escapeHtml(COLLECTION_ADDRESS)}. Collection only.`, `color:${C.muted};font-size:15px;`),
    body:
      `<h2 style="margin:0 0 4px;font-family:${SERIF};font-size:20px;font-weight:600;color:${C.pimento};">Your order</h2>` +
      itemsTable(order) +
      (order.note ? para(`<span style="color:${C.muted};">Your note:</span> ${escapeHtml(order.note)}`, "font-size:15px;") : "") +
      para(
        "All our food is halal. If you have an allergy, reply to this email or tell us when you collect.",
        `margin-top:24px;color:${C.muted};font-size:15px;`,
      ) +
      para(contactHtml(), `color:${C.muted};font-size:15px;`),
    footer: `Flowers Kitchen · ${escapeHtml(COLLECTION_ADDRESS)} · Halal · Collection only`,
  });

  const text = [
    `Thank you, ${firstName}`,
    "",
    `Order #${order.orderNumber}`,
    order.scheduledFor ? `Ready to collect on ${ready}.` : `Ready to collect at ${ready}.`,
    `Collect from ${COLLECTION_ADDRESS}. Collection only.`,
    "",
    ...order.items.map(
      (item) =>
        `${item.quantity} × ${item.name} box${item.options.length ? ` (${item.options.join(", ")})` : ""} — ${formatPence(item.lineTotalPence)}`,
    ),
    `Total paid: ${formatPence(order.totalPence)}`,
    ...(order.note ? ["", `Your note: ${order.note}`] : []),
    "",
    "All our food is halal. If you have an allergy, reply to this email or tell us when you collect.",
    contactText(),
    "",
    `Flowers Kitchen · ${COLLECTION_ADDRESS}`,
  ].join("\n");

  return { subject, html, text };
}

export function buildShopOrderEmail(order: OrderDetail) {
  const ready = order.scheduledFor ? `for ${readyText(order)}` : `ASAP, ready ${readyText(order)}`;
  const subject = `New order #${order.orderNumber} — ${formatPence(order.totalPence)}, ${ready}`;
  const html = layout({
    title: subject,
    eyebrow: order.scheduledFor ? "New scheduled order" : "New online order",
    heading: `Order #${order.orderNumber}`,
    intro:
      para(`Paid ${formatPence(order.totalPence)} · ${escapeHtml(ready)}`) +
      (order.slotOverCapacity ? para("<strong>Over slot capacity:</strong> this time was already full when they paid.") : "") +
      para(
        `${escapeHtml(order.customerName)} · <a href="tel:${escapeHtml(order.customerPhone)}" style="color:${C.sorrel};">${escapeHtml(order.customerPhone)}</a>`,
        "font-size:15px;",
      ),
    body:
      itemsTable(order) +
      (order.note ? para(`<strong>Note:</strong> ${escapeHtml(order.note)}`, "font-size:15px;") : "") +
      para("This is a backup. The order is on the kitchen board.", `margin-top:24px;color:${C.muted};font-size:14px;`),
    footer: "Sent by the Flowers Kitchen website.",
  });
  const text = [
    `NEW ORDER #${order.orderNumber}`,
    `Paid ${formatPence(order.totalPence)} · ${ready}`,
    ...(order.slotOverCapacity ? ["Over slot capacity: this time was already full when they paid."] : []),
    `${order.customerName} · ${order.customerPhone}`,
    "",
    ...order.items.map(
      (item) => `${item.quantity} × ${item.name}${item.options.length ? ` (${item.options.join(", ")})` : ""}`,
    ),
    ...(order.note ? ["", `Note: ${order.note}`] : []),
    "",
    "This is a backup. The order is on the kitchen board.",
  ].join("\n");
  return { subject, html, text };
}

export function buildCancellationEmail(order: OrderDetail) {
  const firstName = order.customerName.split(" ")[0] ?? order.customerName;
  const refundPence = order.refundedPence > 0 ? order.refundedPence : order.paymentStatus === "refunded" ? order.totalPence : 0;
  const subject = `Your Flowers Kitchen order #${order.orderNumber} has been cancelled`;
  const refundLine = refundPence > 0
    ? `We've refunded <strong>${formatPence(refundPence)}</strong> to the card you paid with. Refunds usually take 5–10 working days to reach your account.`
    : "No money was taken for this order.";
  const refundTextLine = refundPence > 0
    ? `We've refunded ${formatPence(refundPence)} to the card you paid with. Refunds usually take 5–10 working days to reach your account.`
    : "No money was taken for this order.";

  const html = layout({
    title: subject,
    eyebrow: `Order #${order.orderNumber}`,
    heading: "Your order has been cancelled",
    intro:
      para(`Sorry, ${escapeHtml(firstName)}. We've had to cancel your order #${order.orderNumber}.`) +
      para(refundLine),
    body:
      `<h2 style="margin:0 0 4px;font-family:${SERIF};font-size:20px;font-weight:600;color:${C.pimento};">What you ordered</h2>` +
      itemsTable(order).replace("Total paid", refundPence > 0 ? "Total refunded" : "Total") +
      para(contactHtml(), `margin-top:24px;color:${C.muted};font-size:15px;`),
    footer: `Flowers Kitchen · ${escapeHtml(COLLECTION_ADDRESS)} · Halal · Collection only`,
  });

  const text = [
    "Your order has been cancelled",
    "",
    `Order #${order.orderNumber}`,
    `Sorry, ${firstName}. We've had to cancel your order #${order.orderNumber}.`,
    refundTextLine,
    "",
    ...order.items.map(
      (item) =>
        `${item.quantity} × ${item.name} box${item.options.length ? ` (${item.options.join(", ")})` : ""} — ${formatPence(item.lineTotalPence)}`,
    ),
    "",
    contactText(),
    "",
    `Flowers Kitchen · ${COLLECTION_ADDRESS}`,
  ].join("\n");

  return { subject, html, text };
}

export function buildReadyEmail(order: OrderDetail) {
  const firstName = order.customerName.split(" ")[0] ?? order.customerName;
  const subject = `Your Flowers Kitchen order #${order.orderNumber} is ready to collect`;
  const html = layout({
    title: subject,
    eyebrow: `Order #${order.orderNumber}`,
    heading: `Your order is ready, ${escapeHtml(firstName)}`,
    intro:
      para(`Your boxes are packed and waiting for you at <strong>${escapeHtml(COLLECTION_ADDRESS)}</strong>.`) +
      para(`Give us your order number, <strong>#${order.orderNumber}</strong>, when you arrive.`),
    body:
      itemsTable(order) + para(contactHtml(), `margin-top:24px;color:${C.muted};font-size:15px;`),
    footer: `Flowers Kitchen · ${escapeHtml(COLLECTION_ADDRESS)} · Halal · Collection only`,
  });
  const text = [
    `Your order is ready, ${firstName}`,
    "",
    `Order #${order.orderNumber}`,
    `Your boxes are packed and waiting for you at ${COLLECTION_ADDRESS}.`,
    `Give us your order number, #${order.orderNumber}, when you arrive.`,
    "",
    contactText(),
    "",
    `Flowers Kitchen · ${COLLECTION_ADDRESS}`,
  ].join("\n");
  return { subject, html, text };
}
