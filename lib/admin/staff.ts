import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRole, type AdminRole } from "@/lib/admin/types";

type AdminUserRow = {
  id: string;
  profile_id: string;
  role: string;
  can_manage_menus: boolean;
  can_manage_orders: boolean;
  can_manage_events: boolean;
  can_manage_catering: boolean;
  is_active: boolean;
  created_at: string;
};

type ProfileRow = { id: string; email: string | null; full_name: string | null };

export type StaffRow = {
  id: string;
  profileId: string;
  email: string | null;
  fullName: string | null;
  role: AdminRole;
  canManageMenus: boolean;
  canManageOrders: boolean;
  canManageEvents: boolean;
  canManageCatering: boolean;
  isActive: boolean;
  createdAt: string;
};

/** Active staff first, then by when they were added. */
export async function fetchStaffRows(supabase: SupabaseClient): Promise<StaffRow[]> {
  const { data: adminRows } = await supabase
    .from("admin_users")
    .select(
      "id, profile_id, role, can_manage_menus, can_manage_orders, can_manage_events, can_manage_catering, is_active, created_at",
    )
    .order("created_at", { ascending: true });

  const rows = (adminRows ?? []) as AdminUserRow[];
  const profileIds = rows.map((r) => r.profile_id);
  const { data: profiles } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, email, full_name").in("id", profileIds)
      : { data: [] };

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return rows
    .map((r) => {
      const profile = profileById.get(r.profile_id);
      return {
        id: r.id,
        profileId: r.profile_id,
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        role: isAdminRole(r.role) ? r.role : "operations",
        canManageMenus: r.can_manage_menus,
        canManageOrders: r.can_manage_orders,
        canManageEvents: r.can_manage_events,
        canManageCatering: r.can_manage_catering,
        isActive: r.is_active,
        createdAt: r.created_at,
      } satisfies StaffRow;
    })
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));
}
