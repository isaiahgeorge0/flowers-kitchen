import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Publishable key, no session: sees exactly what RLS lets the public see (the live menu and
// ordering settings). Safe inside "use cache" because it reads no cookies.
export const publicSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
