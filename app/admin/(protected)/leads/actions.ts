"use server";

import { refresh } from "next/cache";
import { requireAdminForAction } from "@/lib/admin/guards";
import { isLeadStatus, LEAD_STATUS_LABELS } from "@/lib/admin/lead-status";
import { isLeadId } from "@/lib/admin/leads";
import type { AdminActionState } from "@/lib/admin/types";

const NOTES_MAX = 5000;
const QUOTE_MAX = 1_000_000;

const fail = (message: string, values?: Record<string, string>): AdminActionState => ({
  ok: false,
  message,
  at: Date.now(),
  values,
});
const success = (message: string): AdminActionState => ({ ok: true, message, at: Date.now() });

type LeadUpdate = { status?: string; quoted_amount?: number | null; internal_notes?: string | null };

async function updateLead(id: string, changes: LeadUpdate): Promise<string | null> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth.message;
  if (!isLeadId(id)) return "We couldn't find that lead.";

  const { data, error } = await auth.ctx.supabase
    .from("catering_enquiries")
    .update(changes)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return "We couldn't save that. Try again.";
  if (!data) return "We couldn't find that lead.";
  return null;
}

export async function updateLeadStatusAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  if (!isLeadStatus(status)) return fail("Choose a status.");

  const problem = await updateLead(id, { status });
  if (problem) return fail(problem);

  refresh();
  return success(`Marked as ${LEAD_STATUS_LABELS[status].toLowerCase()}.`);
}

/** "£1,250.50", "1250.5" or "450" → 1250.5 / 450. Blank clears the quote. */
function parseQuote(raw: string): { ok: true; value: number | null } | { ok: false } {
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (!cleaned) return { ok: true, value: null };
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return { ok: false };
  const value = Number(cleaned);
  return value <= QUOTE_MAX ? { ok: true, value } : { ok: false };
}

export async function updateLeadDetailsAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const rawQuote = String(formData.get("quotedAmount") ?? "").slice(0, 40);
  const rawNotes = String(formData.get("internalNotes") ?? "").replace(/\r\n/g, "\n");
  const typed = { quotedAmount: rawQuote, internalNotes: rawNotes.slice(0, NOTES_MAX + 100) };

  const quote = parseQuote(rawQuote);
  if (!quote.ok) return fail("Enter the quote in pounds, like 450 or 1250.50.", typed);

  const notes = rawNotes.trim();
  if (notes.length > NOTES_MAX) {
    return fail(`Notes can be up to ${NOTES_MAX.toLocaleString("en-GB")} characters.`, typed);
  }

  const problem = await updateLead(id, {
    quoted_amount: quote.value,
    internal_notes: notes || null,
  });
  if (problem) return fail(problem, typed);

  refresh();
  return success("Saved.");
}
