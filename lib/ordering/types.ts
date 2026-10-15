import type { OpeningHours } from "./hours";

/** A shared item (menu_components): one switch for every box that uses it. */
export type SharedItem = { id: string; name: string; available: boolean; order: number };

export type MenuOption = {
  id: string;
  name: string;
  pricePence: number;
  /** Switched on for this box and, if it's a shared choice, on everywhere. */
  available: boolean;
  component: SharedItem | null;
};

export type MenuChoiceGroup = {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: MenuOption[];
};

export type MenuBox = {
  /** active_menu_items.id: what the cart and checkout reference. */
  id: string;
  /** menu_template_items.id */
  itemId: string;
  slug: string;
  name: string;
  description: string | null;
  pricePence: number;
  allergens: string | null;
  imageUrl: string | null;
  /** Ticked sold out, or a required choice has nothing left to pick. */
  soldOut: boolean;
  featured: boolean;
  groups: MenuChoiceGroup[];
  /** Included sides (mac & cheese, festival, coleslaw). Out ones never stop a sale. */
  sides: SharedItem[];
};

/** A basket line checkout refused, with a one-tap fix when another choice is still on. */
export type BasketFlag = {
  key: string;
  note: string;
  swap: { fromId: string; toId: string; toName: string } | null;
};

/** What the basket needs to flag lines between visits to the order page, by box id. */
export type BasketAvailability = Record<
  string,
  {
    soldOut: boolean;
    missingSides: string[];
    choices: { max: number; options: { id: string; name: string; available: boolean }[] }[];
  }
>;

export type OrderingSettings = {
  acceptingOrders: boolean;
  openingHours: OpeningHours;
  /** ASAP orders are ready this long after payment; scheduled slots start at least this far ahead. */
  leadMinutes: number;
  timezone: string;
  slotMinutes: number;
  maxOrdersPerSlot: number;
  /** How many days after today customers can book. 0 means today only. */
  daysAhead: number;
  /** Same-day collection times stop this long before closing. */
  sameDayCutoffMinutes: number;
  /** ISO time; ASAP ordering is paused until then. Past values mean not paused. */
  pausedUntil: string | null;
  pauseAllowsScheduled: boolean;
  readyEmailEnabled: boolean;
  /** Shared items and boxes go back on sale at 04:00 each day (008_shared_components.sql). */
  resetSoldOutDaily: boolean;
};

export type CollectionChoice = { type: "asap" } | { type: "scheduled"; slot: string };

export type OrderSource = "web" | "qr";

export type CartLine = {
  /** Box id plus sorted option ids, so the same box and choice stack into one line. */
  key: string;
  boxId: string;
  name: string;
  optionIds: string[];
  optionLabels: string[];
  /** Shown to the customer only; the server reprices every line at checkout. */
  unitPence: number;
  quantity: number;
};

export function cartLineKey(boxId: string, optionIds: string[]) {
  return [boxId, ...[...optionIds].sort()].join(":");
}
