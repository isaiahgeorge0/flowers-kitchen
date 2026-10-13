import {
  CATERING_CONFIG,
  tablesFor,
  type CateringEvent,
  type Occasion,
  type ServiceStyle,
} from "@/lib/catering";

// Plain numbers only (metres) so the plan can be described and tested without three.js.

export const TABLE_SPACING = 3;
export const WALL_HEIGHT = 3;
export const BACK_ZONE = 2.4;
export const FRONT_MARGIN = 1;
export const SIDE_MARGIN = 1.2;
export const MIN_ROOM_WIDTH = 8;
export const MAX_TABLES = tablesFor(CATERING_CONFIG.guests.max);
export const SEATS_PER_TABLE = CATERING_CONFIG.guestsPerTable;
export const MAX_BUFFET_TRAYS = CATERING_CONFIG.maxMains + 1;
// Food boxes on the side table sit in neat rows: columns along the table, two rows deep, stacked in layers.
export const BOX_SIZE = { width: 0.36, height: 0.13, depth: 0.27 } as const;
export const SIDE_BOX_COLUMNS = 4;
export const SIDE_BOX_ROWS = 2;
export const SIDE_BOX_LAYERS = 4;
export const MAX_SIDE_BOXES = SIDE_BOX_COLUMNS * SIDE_BOX_ROWS * SIDE_BOX_LAYERS;
export const MAX_TABLE_BOXES = 3;
export const EVENING_FROM = "17:00";

export const COLOURS = {
  cream: "#F3EADB",
  paper: "#FBF6EE",
  pimento: "#2B1B16",
  muted: "#6E5B4F",
  sorrel: "#8F1D2C",
  mountain: "#1E3A30",
  allspice: "#B9853F",
  hairline: "#D9CBB4",
  mountainMuted: "#C9BFAE",
  glow: "#D4A55E",
  floor: "#D9C3A0",
  kraft: "#C9A57E",
  dusk: "#3A4550",
  rug: "#DCC8A9",
} as const;

export type Decor = {
  cloth: string;
  flowers: boolean;
  runner: boolean;
  fairyLights: boolean;
  balloons: boolean;
  tableBalloons: boolean;
  screen: boolean;
};

const PLAIN: Omit<Decor, "cloth"> = {
  flowers: false,
  runner: false,
  fairyLights: false,
  balloons: false,
  tableBalloons: false,
  screen: false,
};

const DECOR: Record<Occasion | "none", Decor> = {
  wedding: { ...PLAIN, cloth: COLOURS.cream, flowers: true, fairyLights: true },
  birthday: { ...PLAIN, cloth: COLOURS.cream, balloons: true, tableBalloons: true },
  corporate: { ...PLAIN, cloth: COLOURS.paper, screen: true },
  christening: { ...PLAIN, cloth: COLOURS.cream, flowers: true, runner: true },
  other: { ...PLAIN, cloth: COLOURS.cream },
  none: { ...PLAIN, cloth: COLOURS.cream },
};

export type RoomPlan = {
  guests: number;
  tables: number;
  /** Table centres, and how many guests sit at each (the last table may be part-filled). */
  slots: { x: number; z: number; seats: number }[];
  width: number;
  depth: number;
  /** Lighter floor zone under the table grid. */
  rug: { z: number; width: number; depth: number };
  decor: Decor;
  service: ServiceStyle | null;
  buffetTrays: number;
  sideBoxes: number;
  evening: boolean;
};

/** Boxes in the centre stack of a table: one per three guests, up to three. */
export const tableBoxes = (seats: number) => Math.min(MAX_TABLE_BOXES, Math.max(1, Math.ceil(seats / 3)));

export function clampGuests(guests: number) {
  const { min, max } = CATERING_CONFIG.guests;
  if (!Number.isFinite(guests)) return CATERING_CONFIG.guests.default;
  return Math.min(max, Math.max(min, Math.round(guests)));
}

/** Centred grid, a little wider than deep, with a short last row centred. */
export function tableGrid(tables: number) {
  const first = Math.max(1, Math.ceil(Math.sqrt(tables * 1.3)));
  const rows = Math.ceil(tables / first);
  const cols = Math.ceil(tables / rows);
  const slots: { x: number; z: number }[] = [];
  for (let i = 0; i < tables; i++) {
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? tables - row * cols : cols;
    const col = i - row * cols;
    slots.push({
      x: (col - (inRow - 1) / 2) * TABLE_SPACING,
      z: row * TABLE_SPACING,
    });
  }
  return { cols, rows, slots };
}

export const isEvening = (time: string) => /^\d{2}:\d{2}/.test(time) && time >= EVENING_FROM;

export function planRoom(event: CateringEvent): RoomPlan {
  const guests = clampGuests(event.guests);
  const tables = tablesFor(guests);
  const grid = tableGrid(tables);
  const width = Math.max(MIN_ROOM_WIDTH, grid.cols * TABLE_SPACING + SIDE_MARGIN * 2);
  const depth = BACK_ZONE + grid.rows * TABLE_SPACING + FRONT_MARGIN;
  const firstRowZ = -depth / 2 + BACK_ZONE + TABLE_SPACING / 2;

  const perTable = CATERING_CONFIG.guestsPerTable;

  return {
    guests,
    tables,
    slots: grid.slots.map((s, i) => ({
      x: s.x,
      z: firstRowZ + s.z,
      seats: Math.min(perTable, guests - i * perTable),
    })),
    width,
    depth,
    rug: {
      z: firstRowZ + ((grid.rows - 1) * TABLE_SPACING) / 2,
      width: grid.cols * TABLE_SPACING - 0.2,
      depth: grid.rows * TABLE_SPACING - 0.2,
    },
    decor: DECOR[event.occasion ?? "none"],
    service: event.service,
    buffetTrays: Math.max(2, Math.min(MAX_BUFFET_TRAYS, event.mains.length + 1)),
    // One box on the side table stands for one table's worth, rounded to full blocks of four.
    sideBoxes: Math.min(MAX_SIDE_BOXES, Math.max(8, Math.ceil(tables / 4) * 4)),
    evening: isEvening(event.time),
  };
}

const OCCASION_PHRASE: Record<Occasion, string> = {
  wedding: "Wedding reception",
  birthday: "Birthday party",
  corporate: "Corporate event",
  christening: "Christening",
  other: "Event",
};

const DECOR_PHRASE: Record<Occasion, string | null> = {
  wedding: "Cream tablecloths with white flower centrepieces and fairy lights along the back wall",
  birthday: "Cream tablecloths with mini balloons at each table and balloon clusters in the back corners",
  corporate: "Paper-white tablecloths with a presentation screen",
  christening: "Cream tablecloths with green runners and flower centrepieces",
  other: "Plain cream tablecloths",
};

export function describeRoom(event: CateringEvent) {
  const plan = planRoom(event);
  const who = event.occasion ? OCCASION_PHRASE[event.occasion] : "Event";
  const tables = `${plan.tables} round ${plan.tables === 1 ? "table" : "tables"}`;
  const service =
    plan.service === "buffet"
      ? `with a buffet of ${plan.buffetTrays} trays along the back wall`
      : plan.service === "boxes"
        ? "with rows of individual boxes on a side table and a small stack at each table"
        : plan.service === "served"
          ? "with a plate set at every seat"
          : "with service not chosen yet";

  const sentences = [`${who} for ${plan.guests} guests: ${tables} ${service}.`];
  const decor = event.occasion ? DECOR_PHRASE[event.occasion] : null;
  if (decor) sentences.push(`${decor}.`);
  if (plan.evening) sentences.push("Evening lighting.");
  return sentences.join(" ");
}
