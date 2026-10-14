"use server";

import { headers } from "next/headers";
import {
  ENQUIRY_MESSAGES,
  estimate,
  estimateLines,
  type CateringEvent,
} from "@/lib/catering";
import { enquirySchema, type Enquiry } from "@/lib/catering-schema";
import { sendEnquiryConfirmation, sendEnquiryNotification } from "@/lib/enquiry-mailer";
import { clientIp, hit, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabase-server";
import { verifyTurnstile } from "@/lib/turnstile";

export type EnquiryInput = CateringEvent & { website?: string; turnstileToken?: string };
export type EnquiryResult = { ok: true } | { ok: false; message: string };

const TABLE = "catering_enquiries";
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const IP_LIMIT = { limit: 3, windowMinutes: 60 };

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
  const ip = await clientIp();

  const token = raw && typeof raw === "object" && "turnstileToken" in raw ? raw.turnstileToken : null;
  try {
    if ((await verifyTurnstile(token, ip)) === "failed") return { ok: false, message: ENQUIRY_MESSAGES.challenge };
  } catch (error) {
    console.error("[catering] Could not reach Turnstile:", describe(error));
    return { ok: false, message: ENQUIRY_MESSAGES.failed };
  }

  // Honeypot: people never see this field, bots fill it. Pretend it worked and do nothing.
  if (raw && typeof raw === "object" && "website" in raw) {
    const { website } = raw as { website: unknown };
    if (typeof website !== "string" || website.trim() !== "") return { ok: true };
  }

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: ENQUIRY_MESSAGES.invalid };
  const enquiry = parsed.data;
  const shownEstimate = estimateText(enquiry);

  const limited = await hit("catering-ip", ip, IP_LIMIT.limit, IP_LIMIT.windowMinutes);
  if (!limited.ok) return { ok: false, message: RATE_LIMITED_MESSAGE };

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

  // The enquiry is saved, so the customer gets a success either way; a failed email is logged
  // and the confirmation can be resent from the admin.
  await sendEnquiryNotification({
    id: saved.id,
    enquiry,
    estimateText: shownEstimate,
    receivedAt: new Date(saved.created_at),
  });
  await sendEnquiryConfirmation(saved.id, enquiry);

  return { ok: true };
}
