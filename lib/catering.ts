// Prices to be supplied by the client. Every price is null ("not set yet") until then,
// and the builder shows £XX placeholders instead of an estimate.
import { BOXES } from "./menu";

export type Occasion =
  | "birthday"
  | "wedding"
  | "corporate"
  | "christening"
  | "other";

export type ServiceStyle = "boxes" | "buffet" | "served";

export type CateringEvent = {
  occasion: Occasion | null;
  guests: number;
  service: ServiceStyle | null;
  mains: string[];
  extras: string[];
  date: string;
  time: string;
  postcode: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type Price = number | null;

type CateringConfig = {
  guests: { min: number; max: number; step: number; default: number };
  guestsPerTable: number;
  maxMains: number;
  extras: string[];
  pricing: {
    perHead: Record<ServiceStyle, Price>;
    extrasPerHead: Price;
  };
};

export const CATERING_CONFIG: CateringConfig = {
  guests: { min: 10, max: 200, step: 5, default: 40 },
  guestsPerTable: 8,
  maxMains: 3,
  extras: ["Extra festival", "Extra mac & cheese", "Plantain", "Drinks"],
  pricing: {
    perHead: { boxes: null, buffet: null, served: null },
    extrasPerHead: null,
  },
};

export const OCCASIONS: { value: Occasion; label: string; description: string }[] = [
  { value: "birthday", label: "Birthday", description: "Parties for any age" },
  { value: "wedding", label: "Wedding", description: "Receptions and wedding celebrations" },
  { value: "corporate", label: "Corporate", description: "Office lunches, meetings and work events" },
  { value: "christening", label: "Christening", description: "Christenings and naming days" },
  { value: "other", label: "Something else", description: "Tell us about any other gathering." },
];

export const SERVICE_STYLES: { value: ServiceStyle; label: string; description: string }[] = [
  { value: "boxes", label: "Individual boxes", description: "Easy to hand out, great for offices and parties" },
  { value: "buffet", label: "Buffet trays", description: "Guests help themselves" },
  { value: "served", label: "Served", description: "We plate up and serve your guests" },
];

export const STEPS = [
  "What's the occasion?",
  "How many guests?",
  "How would you like it served?",
  "What should we cook?",
  "When and where?",
  "Your details",
];

export function emptyEvent(): CateringEvent {
  return {
    occasion: null,
    guests: CATERING_CONFIG.guests.default,
    service: null,
    mains: [],
    extras: [],
    date: "",
    time: "",
    postcode: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
  };
}

export type Estimate =
  | { placeholder: true }
  | { placeholder: false; perHead: number; low: number; high: number };

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

export function estimate(event: CateringEvent): Estimate {
  const { perHead, extrasPerHead } = CATERING_CONFIG.pricing;
  const base = event.service ? perHead[event.service] : null;
  if (base === null) return { placeholder: true };
  if (event.extras.length > 0 && extrasPerHead === null) {
    return { placeholder: true };
  }

  const head = base + event.extras.length * (extrasPerHead ?? 0);
  const total = head * event.guests;
  return {
    placeholder: false,
    perHead: head,
    low: roundTo5(total * 0.9),
    high: roundTo5(total * 1.1),
  };
}

export const guestsInRange = (guests: number) =>
  Number.isInteger(guests) &&
  guests >= CATERING_CONFIG.guests.min &&
  guests <= CATERING_CONFIG.guests.max;

export const tablesFor = (guests: number) =>
  Math.ceil(guests / CATERING_CONFIG.guestsPerTable);

export const occasionLabel = (value: Occasion | null) =>
  OCCASIONS.find((o) => o.value === value)?.label ?? null;

export const serviceLabel = (value: ServiceStyle | null) =>
  SERVICE_STYLES.find((s) => s.value === value)?.label ?? null;

export const mainName = (slug: string) =>
  BOXES.find((box) => box.slug === slug)?.name ?? slug;

export const formatPounds = (n: number) => `£${n.toLocaleString("en-GB")}`;

export function formatDate(iso: string) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export const BUSINESS_TIME_ZONE = "Europe/London";

/** YYYY-MM-DD for today, in the given time zone (the device's own if omitted). */
export function todayISO(timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function estimateLines(est: Estimate) {
  if (est.placeholder) {
    return { perHead: "From £XX per head", total: "Estimated total £XX" };
  }
  return {
    perHead: `${formatPounds(est.perHead)} per head`,
    total: `Estimated total ${formatPounds(est.low)} to ${formatPounds(est.high)}`,
  };
}

export type StepErrors = Partial<Record<keyof CateringEvent, string>>;

// Shared by the builder and the server action so both apply the same rules.
export const PATTERNS = {
  postcode: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s()-]{7,}$/,
  time: /^([01]\d|2[0-3]):[0-5]\d$/,
};

export const FIELD_LIMITS = {
  postcode: 10,
  name: 120,
  email: 254,
  phone: 30,
  notes: 2000,
} as const;

export const ENQUIRY_MESSAGES = {
  failed:
    "Sorry, something went wrong sending your enquiry. Please try again, or message us on Instagram.",
  duplicate:
    "We've just received an enquiry from this email address. Please give it a few minutes before sending another, or message us on Instagram.",
  invalid:
    "Some of your details need another look. Please check each step and try again, or message us on Instagram.",
  challenge:
    "We couldn't confirm you're not a bot. Please complete the check above the button and try again, or message us on Instagram.",
} as const;

export function validateStep(
  step: number,
  event: CateringEvent,
  today: string,
): StepErrors {
  const errors: StepErrors = {};
  const { min, max } = CATERING_CONFIG.guests;

  switch (step) {
    case 1:
      if (!event.occasion) errors.occasion = "Choose an occasion.";
      break;
    case 2:
      if (!guestsInRange(event.guests)) {
        errors.guests = `Choose between ${min} and ${max} guests.`;
      }
      break;
    case 3:
      if (!event.service) errors.service = "Choose how you'd like it served.";
      break;
    case 4:
      if (event.mains.length === 0) errors.mains = "Pick at least one main.";
      break;
    case 5:
      if (!event.date) errors.date = "Choose a date for your event.";
      else if (event.date < today) errors.date = "Choose a date from today onwards.";
      if (!event.time) errors.time = "Choose a time.";
      else if (!PATTERNS.time.test(event.time)) errors.time = "Choose a valid time.";
      if (!event.postcode.trim()) errors.postcode = "Enter the venue postcode.";
      else if (!PATTERNS.postcode.test(event.postcode.trim())) {
        errors.postcode = "Enter a valid UK postcode.";
      }
      break;
    case 6:
      if (!event.name.trim()) errors.name = "Tell us your name.";
      if (!event.email.trim()) errors.email = "Enter your email address.";
      else if (!PATTERNS.email.test(event.email.trim())) {
        errors.email = "Enter a valid email address.";
      }
      if (event.phone.trim() && !PATTERNS.phone.test(event.phone.trim())) {
        errors.phone = "Enter a valid phone number, or leave it blank.";
      }
      break;
  }

  return errors;
}
