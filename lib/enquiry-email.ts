import "server-only";
import {
  formatDate,
  mainName,
  occasionLabel,
  serviceLabel,
  tablesFor,
} from "./catering";
import { BUSINESS_TIME_ZONE, type Enquiry } from "./catering-schema";
import { address } from "./site";

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

type Row = { label: string; text: string; html?: string };

/** The event as the customer described it: shared by the shop notification and their confirmation. */
function eventRows(enquiry: Enquiry): Row[] {
  const date = formatDate(enquiry.date) ?? enquiry.date;
  return [
    { label: "Occasion", text: occasionLabel(enquiry.occasion) ?? enquiry.occasion },
    { label: "Guests", text: `${enquiry.guests} · about ${tablesFor(enquiry.guests)} tables` },
    { label: "Service", text: serviceLabel(enquiry.service) ?? enquiry.service },
    { label: "Mains", text: enquiry.mains.map(mainName).join(", ") },
    { label: "Extras", text: enquiry.extras.join(", ") || "None" },
    { label: "Date", text: date },
    { label: "Time", text: enquiry.time },
    { label: "Venue postcode", text: enquiry.postcode },
  ];
}

const cell = `padding:10px 0;border-bottom:1px solid ${C.hairline};vertical-align:top;font-family:${SANS};font-size:15px;line-height:1.5;`;

function rowsHtml(rows: Row[]) {
  const body = rows
    .map(
      (row) => `<tr>
        <th scope="row" align="left" style="${cell}width:140px;padding-right:16px;font-weight:400;color:${C.muted};">${escapeHtml(row.label)}</th>
        <td style="${cell}color:${C.pimento};">${row.html ?? escapeHtml(row.text).replace(/\n/g, "<br>")}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.hairline};">${body}</table>`;
}

function rowsText(rows: Row[]) {
  const width = Math.max(...rows.map((row) => row.label.length));
  return rows.map((row) => `${`${row.label}:`.padEnd(width + 2)}${row.text.replace(/\n/g, `\n${" ".repeat(width + 2)}`)}`);
}

export function buildEnquiryEmail({
  id,
  enquiry,
  estimateText,
  receivedAt,
}: {
  id: string;
  enquiry: Enquiry;
  estimateText: string;
  receivedAt: Date;
}) {
  const occasion = occasionLabel(enquiry.occasion) ?? enquiry.occasion;
  const date = formatDate(enquiry.date) ?? enquiry.date;
  const received = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(receivedAt);

  const subject = `New catering enquiry — ${occasion}, ${enquiry.guests} guests, ${date}`;

  const rows: Row[] = [
    ...eventRows(enquiry),
    { label: "Name", text: enquiry.name },
    {
      label: "Email",
      text: enquiry.email,
      html: `<a href="mailto:${escapeHtml(enquiry.email)}" style="color:${C.sorrel};">${escapeHtml(enquiry.email)}</a>`,
    },
    {
      label: "Phone",
      text: enquiry.phone || "Not given",
      html: enquiry.phone
        ? `<a href="tel:${escapeHtml(enquiry.phone.replace(/[^\d+]/g, ""))}" style="color:${C.sorrel};">${escapeHtml(enquiry.phone)}</a>`
        : undefined,
    },
    { label: "Notes", text: enquiry.notes || "None" },
    { label: "Estimate shown", text: estimateText },
    { label: "Received", text: received },
    { label: "Reference", text: id },
  ];

  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};color:${C.pimento};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.paper};border:1px solid ${C.hairline};border-radius:2px;">
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;color:${C.sorrel};">Catering enquiry</p>
            <h1 style="margin:12px 0 0;font-family:${SERIF};font-size:28px;font-weight:600;line-height:1.15;color:${C.sorrel};">${escapeHtml(occasion)} for ${enquiry.guests} guests</h1>
            <p style="margin:8px 0 0;font-family:${SANS};font-size:16px;line-height:1.5;color:${C.pimento};">${escapeHtml(date)} · ${escapeHtml(enquiry.time)} · ${escapeHtml(enquiry.postcode)}</p>
            <p style="margin:16px 0 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${C.muted};">Reply to this email to answer ${escapeHtml(enquiry.name)} directly.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px;">
            <h2 style="margin:0 0 4px;font-family:${SERIF};font-size:20px;font-weight:600;color:${C.sorrel};">Details</h2>
            ${rowsHtml(rows)}
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:${SANS};font-size:13px;color:${C.muted};">Sent from the catering form on the Flowers Kitchen website.</p>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    "NEW CATERING ENQUIRY",
    "",
    `${occasion} for ${enquiry.guests} guests`,
    `${date} · ${enquiry.time} · ${enquiry.postcode}`,
    "",
    ...rowsText(rows),
    "",
    `Reply to this email to answer ${enquiry.name} directly.`,
    "",
    "Sent from the catering form on the Flowers Kitchen website.",
  ].join("\n");

  return { subject, html, text };
}

/** "Thanks — we've got your enquiry", to the customer. Replies go to the catering inbox. */
export function buildEnquiryConfirmationEmail(enquiry: Enquiry) {
  const firstName = enquiry.name.split(" ")[0] || enquiry.name;
  const subject = "Thanks — we've got your catering enquiry";
  const heading = "Thanks — we've got your enquiry";
  const rows: Row[] = [...eventRows(enquiry), ...(enquiry.notes ? [{ label: "Your notes", text: enquiry.notes }] : [])];
  const intro = `Hi ${firstName}, thanks for telling us about your event. We'll look over the details and come back to you with a quote.`;
  const reply = "Anything to add or change? Just reply to this email.";
  const footer = `Flowers Kitchen Catering · ${address}`;

  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};color:${C.pimento};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.paper};border:1px solid ${C.hairline};border-radius:2px;">
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;color:${C.sorrel};">Catering enquiry</p>
            <h1 style="margin:12px 0 0;font-family:${SERIF};font-size:28px;font-weight:600;line-height:1.15;color:${C.pimento};">${escapeHtml(heading)}</h1>
            <p style="margin:12px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.pimento};">${escapeHtml(intro)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px;">
            <h2 style="margin:0 0 4px;font-family:${SERIF};font-size:20px;font-weight:600;color:${C.pimento};">Your event</h2>
            ${rowsHtml(rows)}
            <p style="margin:24px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.muted};">${escapeHtml(reply)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.muted};">${escapeHtml(footer)}</p>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [heading, "", intro, "", "YOUR EVENT", ...rowsText(rows), "", reply, "", footer].join("\n");

  return { subject, html, text };
}
