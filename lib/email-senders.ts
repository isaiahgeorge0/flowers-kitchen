import "server-only";
import { env } from "./env";

// Who each kind of email comes from and where replies go. Orders and catering stay separate so
// each lands in its own inbox.

export const orderMail = {
  from: `Flowers Kitchen <${env.ORDERS_FROM_EMAIL}>`,
  /** Receives the "New order" alert. */
  shopInbox: env.ORDERS_TO_EMAIL,
  /** Customer replies to order emails go here. */
  replyTo: env.ORDERS_TO_EMAIL,
};

export const cateringMail = {
  from: `Flowers Kitchen Catering <${env.ENQUIRY_FROM_EMAIL}>`,
  /** Receives new enquiries. */
  shopInbox: env.ENQUIRY_TO_EMAIL,
  /** Customer replies to the enquiry confirmation go here. */
  replyTo: env.ENQUIRY_TO_EMAIL,
};
