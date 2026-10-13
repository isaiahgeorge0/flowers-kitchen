import "server-only";
import { z } from "zod";

const schema = z
  .object({
    SUPABASE_URL: z.url(),
    // Holds the project's secret key (sb_secret_…). Server only; bypasses RLS.
    SUPABASE_SERVICE_ROLE_KEY: z.string().startsWith("sb_secret_"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    // Safe in the browser: every table it can reach is protected by RLS.
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
    RESEND_API_KEY: z.string().min(1),
    ENQUIRY_TO_EMAIL: z.email(),
    // Either "hello@example.com" or "Flowers Kitchen <hello@example.com>".
    ENQUIRY_FROM_EMAIL: z.string().min(3),
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
