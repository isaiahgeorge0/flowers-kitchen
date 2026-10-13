import type { SupabaseClient } from "@supabase/supabase-js";
import { toPence } from "./money";
import type { OrderSource } from "./types";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready_for_collection" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export type OrderDetail = {
  id: string;
  orderNumber: number;
  publicToken: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  refundStatus: "none" | "partial" | "full";
  totalPence: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note: string | null;
  leadMinutes: number;
  estimatedReadyAt: string | null;
  createdAt: string;
  paymentConfirmedAt: string | null;
  confirmedAt: string | null;
  preparedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  stripePaymentIntentId: string | null;
  collectionType: "asap" | "scheduled";
  /** Start of the chosen collection slot (ISO); null for ASAP. */
  scheduledFor: string | null;
  slotOverCapacity: boolean;
  source: OrderSource;
  refundedPence: number;
  items: { id: string; name: string; quantity: number; unitPence: number; lineTotalPence: number; options: string[] }[];
};

export const ORDER_SELECT = `
  id, order_number, public_token, order_status, payment_status, refund_status, total_amount, refunded_total,
  customer_name, customer_phone, customer_email, special_instructions, collection_lead_minutes,
  estimated_ready_at, created_at, payment_confirmed_at, confirmed_at, prepared_at, ready_at,
  completed_at, cancelled_at, cancel_reason, stripe_payment_intent_id,
  collection_type, scheduled_for, slot_over_capacity, source,
  order_items (
    id, item_name_snapshot, unit_price_snapshot, options_unit_total_snapshot, quantity, line_total, created_at,
    order_item_options ( option_name_snapshot, created_at )
  )
`;

type OrderRow = {
  id: string;
  order_number: number;
  public_token: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  refund_status: OrderDetail["refundStatus"];
  total_amount: number | string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  special_instructions: string | null;
  collection_lead_minutes: number;
  estimated_ready_at: string | null;
  created_at: string;
  payment_confirmed_at: string | null;
  confirmed_at: string | null;
  prepared_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  stripe_payment_intent_id: string | null;
  refunded_total: number | string | null;
  collection_type: "asap" | "scheduled" | null;
  scheduled_for: string | null;
  slot_over_capacity: boolean | null;
  source: string | null;
  order_items: {
    id: string;
    item_name_snapshot: string;
    unit_price_snapshot: number | string;
    options_unit_total_snapshot: number | string;
    quantity: number;
    line_total: number | string;
    created_at: string;
    order_item_options: { option_name_snapshot: string; created_at: string }[];
  }[];
};

export function mapOrder(row: OrderRow): OrderDetail {
  return {
    id: row.id,
    orderNumber: Number(row.order_number),
    publicToken: row.public_token,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    refundStatus: row.refund_status,
    totalPence: toPence(row.total_amount),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    note: row.special_instructions,
    leadMinutes: row.collection_lead_minutes,
    estimatedReadyAt: row.estimated_ready_at,
    createdAt: row.created_at,
    paymentConfirmedAt: row.payment_confirmed_at,
    confirmedAt: row.confirmed_at,
    preparedAt: row.prepared_at,
    readyAt: row.ready_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    collectionType: row.collection_type === "scheduled" && row.scheduled_for ? "scheduled" : "asap",
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : null,
    slotOverCapacity: row.slot_over_capacity === true,
    source: row.source === "qr" ? "qr" : "web",
    refundedPence: toPence(row.refunded_total ?? 0),
    items: [...row.order_items]
      .sort((a, b) => a.item_name_snapshot.localeCompare(b.item_name_snapshot) || a.id.localeCompare(b.id))
      .map((item) => ({
        id: item.id,
        name: item.item_name_snapshot,
        quantity: item.quantity,
        unitPence: toPence(item.unit_price_snapshot) + toPence(item.options_unit_total_snapshot),
        lineTotalPence: toPence(item.line_total),
        options: item.order_item_options.map((option) => option.option_name_snapshot),
      })),
  };
}

export async function readOrder(client: SupabaseClient, by: { id: string } | { token: string }) {
  const query = client.from("orders").select(ORDER_SELECT);
  const { data, error } = await ("id" in by ? query.eq("id", by.id) : query.eq("public_token", by.token)).maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data as unknown as OrderRow) : null;
}

export { formatClock } from "./hours";

/** When the customer collects: the booked slot, or the ASAP estimate. */
export function collectionAt(order: Pick<OrderDetail, "scheduledFor" | "estimatedReadyAt">) {
  return order.scheduledFor ?? order.estimatedReadyAt;
}
