"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import {
  ENQUIRY_MESSAGES,
  estimate,
  estimateLines,
  type CateringEvent,
} from "@/lib/catering";
import { enquirySchema, type Enquiry } from "@/lib/catering-schema";
import { buildEnquiryEmail } from "@/lib/enquiry-email";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase-server";

// TODO: Customer confirmation email — enable once the client's domain is verified in Resend.

export type EnquiryInput = CateringEvent & { website?: string };
export type EnquiryResult = { ok: true } | { ok: false; message: string };

const TABLE = "catering_enquiries";
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const resend = new Resend(env.RESEND_API_KEY);

function describe(error: unknown) {
  if (error && typeof error === "object") {
    const { name, message, code } = error as { name?: unknown; message?: unknown; code?: unknown };
    return { name, message, code };
  }
  return { message: String(error) };
}

function estimateText(enquiry: Enquiry) {
  const { perHead, total } = estimateLines(estimate(enquiry));
  return `${perHead} · ${total}`;
}

export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  const raw: unknown = input;

  // Honeypot: people never see this field, bots fill it. Pretend it worked and do nothing.
  if (raw && typeof raw === "object" && "website" in raw) {
    const { website } = raw as { website: unknown };
    if (typeof website !== "string" || website.trim() !== "") return { ok: true };
  }

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: ENQUIRY_MESSAGES.invalid };
  const enquiry = parsed.data;
  const shownEstimate = estimateText(enquiry);

  let saved: { id: string; created_at: string };
  try {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const recent = await supabase
      .from(TABLE)
      .select("id")
      .eq("email", enquiry.email)
      .gte("created_at", since)
      .limit(1);
    if (recent.error) throw recent.error;
    if (recent.data.length > 0) return { ok: false, message: ENQUIRY_MESSAGES.duplicate };

    const userAgent = (await headers()).get("user-agent")?.slice(0, 500) ?? null;
    const inserted = await supabase
      .from(TABLE)
      .insert({
        occasion: enquiry.occasion,
        guests: enquiry.guests,
        service: enquiry.service,
        mains: enquiry.mains,
        extras: enquiry.extras,
        event_date: enquiry.date,
        event_time: enquiry.time,
        postcode: enquiry.postcode,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone || null,
        notes: enquiry.notes || null,
        estimate_text: shownEstimate,
        user_agent: userAgent,
      })
      .select("id, created_at")
      .single();
    if (inserted.error) throw inserted.error;
    saved = inserted.data;
  } catch (error) {
    console.error("[catering] Could not save enquiry:", describe(error));
    return { ok: false, message: ENQUIRY_MESSAGES.failed };
  }

  // The enquiry is saved, so the customer gets a success either way; a failed email is logged.
  try {
    const email = buildEnquiryEmail({
      id: saved.id,
      enquiry,
      estimateText: shownEstimate,
      receivedAt: new Date(saved.created_at),
    });
    const { error } = await resend.emails.send(
      {
        from: env.ENQUIRY_FROM_EMAIL,
        to: env.ENQUIRY_TO_EMAIL,
        replyTo: enquiry.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      { idempotencyKey: `catering-enquiry-${saved.id}` },
    );
    if (error) throw error;
  } catch (error) {
    console.error(`[catering] Enquiry ${saved.id} saved but the notification email failed:`, describe(error));
  }

  return { ok: true };
}
