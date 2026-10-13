import "server-only";

import { connection } from "next/server";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readMustChangePassword } from "@/lib/admin/password-metadata";
import { createAdminSessionClient } from "@/lib/admin/supabase";
import { isAdminRole, type AdminUser } from "@/lib/admin/types";

type AdminUserRow = {
  id: string;
  profile_id: string;
  role: string;
  can_manage_menus: boolean;
  can_manage_orders: boolean;
  can_manage_events: boolean;
  can_manage_catering: boolean;
};

/**
 * Loads the active `admin_users` row for a signed-in user. Uses the session client, so
 * RLS (`admin_users_select_self_or_admin`) applies.
 */
export async function lookupActiveAdminUser(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from("admin_users")
    .select(
      "id, profile_id, role, can_manage_menus, can_manage_orders, can_manage_events, can_manage_catering",
    )
    .eq("profile_id", authUserId)
    .eq("is_active", true)
    .maybeSingle<AdminUserRow>();

  if (error || !data || !isAdminRole(data.role)) return null;

  return {
    id: data.id,
    profileId: data.profile_id,
    role: data.role,
    canManageMenus: data.can_manage_menus,
    canManageOrders: data.can_manage_orders,
    canManageEvents: data.can_manage_events,
    canManageCatering: data.can_manage_catering,
  };
}

export type AdminSessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  mustChangePassword: boolean;
  metadata: Record<string, unknown>;
};

export type AdminRequestContext = {
  supabase: SupabaseClient;
  user: AdminSessionUser | null;
  adminUser: AdminUser | null;
};

/**
 * Session + staff row for this request. Cached per render pass, so the layout, page and
 * nested components share one lookup.
 */
export const getAdminRequestContext = cache(async (): Promise<AdminRequestContext> => {
  // Keeps staff data out of prefetched shells; supabase-js also reads the clock here.
  await connection();
  const supabase = await createAdminSessionClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { supabase, user: null, adminUser: null };
  }

  const u = data.user;
  const metadata = (u.user_metadata ?? {}) as Record<string, unknown>;
  const adminUser = await lookupActiveAdminUser(supabase, u.id);
  const metaName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";

  return {
    supabase,
    user: {
      id: u.id,
      email: u.email ?? null,
      displayName: metaName || null,
      mustChangePassword: readMustChangePassword(metadata),
      metadata,
    },
    adminUser,
  };
});
