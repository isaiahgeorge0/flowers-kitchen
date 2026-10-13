import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isLeadStatus, LEAD_STATUSES, type LeadStatus } from "@/lib/admin/lead-status";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isLeadId = (value: string) => UUID_RE.test(value);

export const LEADS_LIST_LIMIT = 200;

export type LeadListItem = {
  id: string;
  createdAt: string;
  status: LeadStatus;
  occasion: string;
  guests: number;
  eventDate: string;
  name: string;
  email: string;
};

export type Lead = LeadListItem & {
  updatedAt: string;
  service: string;
  mains: string[];
  extras: string[];
  eventTime: string;
  postcode: string;
  phone: string | null;
  notes: string | null;
  estimateText: string;
  internalNotes: string | null;
  quotedAmount: number | null;
};

type LeadRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
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
  estimate_text: string;
  internal_notes: string | null;
  quoted_amount: number | string | null;
};

const LIST_COLUMNS = "id, created_at, status, occasion, guests, event_date, name, email";
const DETAIL_COLUMNS =
  "id, created_at, updated_at, status, occasion, guests, service, mains, extras, event_date, event_time, postcode, name, email, phone, notes, estimate_text, internal_notes, quoted_amount";

function toListItem(row: Pick<LeadRow, "id" | "created_at" | "status" | "occasion" | "guests" | "event_date" | "name" | "email">): LeadListItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: isLeadStatus(row.status) ? row.status : "new",
    occasion: row.occasion,
    guests: row.guests,
    eventDate: row.event_date,
    name: row.name,
    email: row.email,
  };
}

/**
 * Makes a search term safe to embed in a PostgREST `or=(...)` filter: drops the
 * characters that have meaning there or in ILIKE, and caps the length.
 */
export function cleanLeadSearch(raw: string | undefined) {
  return (raw ?? "").replace(/[%*,()"\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Newest first, optionally filtered by status and a name/email search. */
export async function fetchLeads(
  supabase: SupabaseClient,
  { status, search }: { status: LeadStatus | null; search: string },
): Promise<{ leads: LeadListItem[]; failed: boolean }> {
  let query = supabase
    .from("catering_enquiries")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(LEADS_LIST_LIMIT);

  if (status) query = query.eq("status", status);
  if (search) query = query.or(`name.ilike."%${search}%",email.ilike."%${search}%"`);

  const { data, error } = await query;
  if (error) return { leads: [], failed: true };
  return { leads: ((data ?? []) as LeadRow[]).map(toListItem), failed: false };
}

export type LeadCounts = Record<LeadStatus | "all", number>;

/** Lead totals per status. The table stays small, so a status-only scan is fine. */
export async function fetchLeadCounts(supabase: SupabaseClient): Promise<LeadCounts> {
  const counts = Object.fromEntries([["all", 0], ...LEAD_STATUSES.map((s) => [s, 0])]) as LeadCounts;
  const { data } = await supabase.from("catering_enquiries").select("status");

  for (const row of (data ?? []) as { status: string }[]) {
    counts.all += 1;
    if (isLeadStatus(row.status)) counts[row.status] += 1;
  }
  return counts;
}

export async function fetchLead(supabase: SupabaseClient, id: string): Promise<Lead | null> {
  if (!isLeadId(id)) return null;

  const { data, error } = await supabase
    .from("catering_enquiries")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle<LeadRow>();

  if (error || !data) return null;

  return {
    ...toListItem(data),
    updatedAt: data.updated_at,
    service: data.service,
    mains: data.mains ?? [],
    extras: data.extras ?? [],
    eventTime: data.event_time,
    postcode: data.postcode,
    phone: data.phone,
    notes: data.notes,
    estimateText: data.estimate_text,
    internalNotes: data.internal_notes,
    quotedAmount: data.quoted_amount === null ? null : Number(data.quoted_amount),
  };
}

/** Booked and quoted events with a date between `from` and `to` (inclusive, YYYY-MM-DD). */
export async function fetchUpcomingEvents(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<LeadListItem[]> {
  const { data } = await supabase
    .from("catering_enquiries")
    .select(LIST_COLUMNS)
    .in("status", ["booked", "quoted"])
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date", { ascending: true });

  return ((data ?? []) as LeadRow[]).map(toListItem);
}
