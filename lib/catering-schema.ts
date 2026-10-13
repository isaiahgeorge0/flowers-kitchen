import "server-only";
import { z } from "zod";
import {
  CATERING_CONFIG,
  FIELD_LIMITS,
  OCCASIONS,
  SERVICE_STYLES,
  STEPS,
  todayISO,
  validateStep,
  type Occasion,
  type ServiceStyle,
} from "./catering";
import { BOXES } from "./menu";

export const BUSINESS_TIME_ZONE = "Europe/London";

type NonEmpty<T> = [T, ...T[]];
const occasions = OCCASIONS.map((o) => o.value) as NonEmpty<Occasion>;
const services = SERVICE_STYLES.map((s) => s.value) as NonEmpty<ServiceStyle>;
const mainSlugs = BOXES.map((box) => box.slug) as NonEmpty<string>;
const extras = CATERING_CONFIG.extras as NonEmpty<string>;

const text = (max: number) => z.string().trim().max(max);
const distinct = (list: string[]) => new Set(list).size === list.length;

// The shape check is zod's job; the business rules are the builder's own validateStep,
// run for every step, so the server can never drift from what the customer was told.
export const enquirySchema = z
  .object({
    occasion: z.enum(occasions),
    guests: z.number().int(),
    service: z.enum(services),
    mains: z.array(z.enum(mainSlugs)).max(CATERING_CONFIG.maxMains).refine(distinct),
    extras: z.array(z.enum(extras)).refine(distinct),
    date: z.iso.date(),
    time: z.string().max(5),
    postcode: text(FIELD_LIMITS.postcode).transform((v) => v.toUpperCase()),
    name: text(FIELD_LIMITS.name),
    email: text(FIELD_LIMITS.email).transform((v) => v.toLowerCase()),
    phone: text(FIELD_LIMITS.phone),
    notes: text(FIELD_LIMITS.notes),
  })
  .superRefine((event, ctx) => {
    const today = todayISO(BUSINESS_TIME_ZONE);
    for (let step = 1; step <= STEPS.length; step++) {
      for (const [field, message] of Object.entries(validateStep(step, event, today))) {
        ctx.addIssue({ code: "custom", path: [field], message });
      }
    }
  });

export type Enquiry = z.output<typeof enquirySchema>;
