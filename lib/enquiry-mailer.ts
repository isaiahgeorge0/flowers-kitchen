import "server-only";
import { Resend } from "resend";
import type { Occasion, ServiceStyle } from "@/lib/catering";
import type { Enquiry } from "@/lib/catering-schema";
import { cateringMail } from "@/lib/email-senders";
import { buildEnquiryConfirmationEmail, buildEnquiryEmail } from "@/lib/enquiry-email";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase-server";

// Like the order emails: a Resend idempotency key per enquiry, and confirmation_email_sent_at so
// a resend from the admin never sends the confirmation twice.

const resend = new Resend(env.RESEND_API_KEY);
const TABLE = "catering_enquiries";

function describe(error: unknown) {
  if (error && typeof error === "object") {
    const { name, message, statusCode } = error as Record<string, unknown>;
    return { name, message, statusCode };
  }
  return { message: String(error) };
}

/** "New catering enquiry", to the catering inbox. */
export async function sendEnquiryNotification(details: Parameters<typeof buildEnquiryEmail>[0]) {
  try {
    const { error } = await resend.emails.send(
      { from: cateringMail.from, to: cateringMail.shopInbox, replyTo: details.enquiry.email, ...buildEnquiryEmail(details) },
      { idempotencyKey: `catering-enquiry-${details.id}` },
    );
    if (error) throw error;
  } catch (error) {
    console.error(`[catering] Enquiry ${details.id} saved but the notification email failed:`, describe(error));
  }
}

/** "Thanks — we've got your enquiry", to the customer. Returns false if it couldn't be sent. */
export async function sendEnquiryConfirmation(id: string, enquiry: Enquiry) {
  try {
    const { error } = await resend.emails.send(
      { from: cateringMail.from, to: enquiry.email, replyTo: cateringMail.replyTo, ...buildEnquiryConfirmationEmail(enquiry) },
      { idempotencyKey: `catering-confirmation-${id}` },
    );
    if (error) throw error;
    await supabase.from(TABLE).update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", id);
    return true;
  } catch (error) {
    console.error(`[catering] Confirmation email for enquiry ${id} failed:`, describe(error));
    return false;
  }
}

type ConfirmationRow = {
  occasion: string;
  guests: number;
  service: string;
  mains: string[] | null;
  extras: string[] | null;
  event_date: string;
  event_time: string;
  postcode: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  confirmation_email_sent_at: string | null;
};

/** Retries the customer's confirmation from the admin, only if it never went out. */
export async function resendEnquiryConfirmation(id: string): Promise<"sent" | "already-sent" | "not-found" | "failed"> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "occasion, guests, service, mains, extras, event_date, event_time, postcode, name, email, phone, notes, confirmation_email_sent_at",
    )
    .eq("id", id)
    .maybeSingle<ConfirmationRow>();
  if (error) return "failed";
  if (!data) return "not-found";
  if (data.confirmation_email_sent_at) return "already-sent";

  // Rebuilt exactly as it was submitted, so Resend's idempotency key still matches within 24 hours.
  const enquiry: Enquiry = {
    occasion: data.occasion as Occasion,
    guests: data.guests,
    service: data.service as ServiceStyle,
    mains: data.mains ?? [],
    extras: data.extras ?? [],
    date: data.event_date,
    time: data.event_time,
    postcode: data.postcode,
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    notes: data.notes ?? "",
  };
  return (await sendEnquiryConfirmation(id, enquiry)) ? "sent" : "failed";
}
