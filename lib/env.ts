import "server-only";
import { z } from "zod";

// A sender address. "Name <address>" is accepted too, but the name is dropped: lib/email-senders.ts
// sets the display names.
const senderAddress = z
  .string()
  .trim()
  .transform((value) => value.match(/<([^<>]+)>\s*$/)?.[1]?.trim() ?? value)
  .pipe(z.email());

const schema = z
  .object({
    SUPABASE_URL: z.url(),
    // Holds the project's secret key (sb_secret_…). Server only; bypasses RLS.
    SUPABASE_SERVICE_ROLE_KEY: z.string().startsWith("sb_secret_"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    // Safe in the browser: every table it can reach is protected by RLS.
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
    RESEND_API_KEY: z.string().min(1),
    // Catering enquiries only: the shop's catering inbox, and the address enquiry emails come from.
    ENQUIRY_TO_EMAIL: z.email(),
    ENQUIRY_FROM_EMAIL: senderAddress,
    // Online orders only: the shop's orders inbox (new-order alerts, customer replies), and the
    // address every order email comes from.
    ORDERS_TO_EMAIL: z.email(),
    ORDERS_FROM_EMAIL: senderAddress,
  })
  .refine((value) => value.SUPABASE_URL === value.NEXT_PUBLIC_SUPABASE_URL, {
    path: ["NEXT_PUBLIC_SUPABASE_URL"],
    message: "must match SUPABASE_URL",
  });

function readEnv() {
  const result = schema.safeParse(process.env);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const key = String(issue.path[0]);
    return `  - ${key}: ${process.env[key] ? "invalid value" : "missing"}`;
  });
  throw new Error(
    `Flowers Kitchen: environment variables are missing or invalid:\n${problems.join("\n")}\n` +
      "Set them in .env.local for local development, or in your hosting provider's settings.",
  );
}

export const env = readEnv();

// Stripe is checked on first use, so the rest of the site still runs while it is being set up.
const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/, "must start with sk_test_ or sk_live_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  // Public origin with no trailing slash, e.g. http://localhost:3000 or https://flowerskitchen.co.uk
  NEXT_PUBLIC_SITE_URL: z.url(),
  // Staging only: allow sk_test_ keys when NODE_ENV=production.
  STRIPE_ALLOW_TEST_KEYS: z.enum(["true", "false", ""]).optional(),
});

export type StripeEnv = {
  secretKey: string;
  webhookSecret: string;
  siteUrl: string;
  mode: "test" | "live";
};

let stripeEnvCache: StripeEnv | null = null;

export function stripeEnv(): StripeEnv {
  if (stripeEnvCache) return stripeEnvCache;

  const result = stripeSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const key = String(issue.path[0]);
      return `  - ${key}: ${process.env[key] ? "invalid value" : "missing"}`;
    });
    throw new Error(`Flowers Kitchen: Stripe settings are missing or invalid:\n${problems.join("\n")}`);
  }

  const value = result.data;
  const mode = value.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : "test";
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction && mode === "live") {
    throw new Error(
      "Flowers Kitchen: STRIPE_SECRET_KEY is a LIVE key outside production. Use an sk_test_ key locally.",
    );
  }
  if (isProduction && mode === "test" && value.STRIPE_ALLOW_TEST_KEYS !== "true") {
    throw new Error(
      "Flowers Kitchen: production is using a Stripe TEST key. Install live keys, or set " +
        "STRIPE_ALLOW_TEST_KEYS=true only on a staging site.",
    );
  }

  const site = new URL(value.NEXT_PUBLIC_SITE_URL);
  if (isProduction && site.protocol !== "https:") {
    throw new Error("Flowers Kitchen: NEXT_PUBLIC_SITE_URL must use https in production.");
  }

  stripeEnvCache = {
    secretKey: value.STRIPE_SECRET_KEY,
    webhookSecret: value.STRIPE_WEBHOOK_SECRET,
    siteUrl: site.origin,
    mode,
  };
  return stripeEnvCache;
}
