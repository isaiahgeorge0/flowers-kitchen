// Public Supabase settings for the session clients. Kept free of `server-only` so proxy.ts
// can use it; lib/env.ts validates the same variables at server start-up.
export function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Flowers Kitchen: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.",
    );
  }
  return { url, publishableKey };
}
