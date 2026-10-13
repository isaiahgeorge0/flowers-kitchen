import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "@/lib/supabase-public-env";

/**
 * Cookie-aware client for admin Server Components and Server Actions.
 * Uses the publishable key and the signed-in user's session, so RLS applies.
 * For secret-key access use `supabase` from lib/supabase-server.ts instead.
 */
export async function createAdminSessionClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabasePublicEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can't write cookies; proxy.ts and Server Actions refresh them.
        }
      },
    },
  });
}
