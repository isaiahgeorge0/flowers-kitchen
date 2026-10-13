// Bigger orders go through catering so the kitchen isn't surprised mid-service.
export const MAX_LINE_QUANTITY = 20;
export const MAX_ORDER_QUANTITY = 30;

export const BIG_ORDER_MESSAGE =
  `For more than ${MAX_ORDER_QUANTITY} boxes, please send us a catering enquiry.`;

export const COLLECTION_ADDRESS = "St Helen's Street, Ipswich";

/** Minutes the kitchen can pause online ordering for. */
export const PAUSE_OPTIONS = [15, 30, 60] as const;

/** Scheduled orders join the kitchen's New column this long before their collection time. */
export const UPCOMING_WINDOW_MINUTES = 30;

export const SLOT_MINUTE_OPTIONS = [10, 15, 20, 30, 60] as const;
