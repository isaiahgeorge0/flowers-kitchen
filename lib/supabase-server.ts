import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service role client: bypasses RLS. Server code only — never import this from a client component.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
