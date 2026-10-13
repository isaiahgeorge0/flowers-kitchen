import type { OpeningHours } from "./hours";

export type MenuOption = {
  id: string;
  name: string;
  pricePence: number;
  available: boolean;
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
  soldOut: boolean;
  featured: boolean;
  groups: MenuChoiceGroup[];
};

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
