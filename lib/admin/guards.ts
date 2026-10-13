import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAdminRequestContext,
  type AdminSessionUser,
} from "@/lib/admin/context";
import { safeAdminNextPath } from "@/lib/admin/paths";
import { ADMIN_PATH_HEADER } from "@/lib/admin/proxy-session";
import { canManageStaff, type AdminUser } from "@/lib/admin/types";

export type ActiveAdminContext = {
  supabase: SupabaseClient;
  user: AdminSessionUser;
  adminUser: AdminUser;
};

/**
 * Guard for admin pages and layouts.
 * - Signed out → /admin/sign-in with a safe `next`.
 * - Signed in but not active staff → /admin/unauthorized.
 */
export async function requireActiveAdmin(): Promise<ActiveAdminContext> {
  const ctx = await getAdminRequestContext();

  if (!ctx.user) {
    const attempted = (await headers()).get(ADMIN_PATH_HEADER);
    const next = safeAdminNextPath(attempted);
    redirect(next === "/admin" ? "/admin/sign-in" : `/admin/sign-in?${new URLSearchParams({ next })}`);
  }

  if (!ctx.adminUser) {
    redirect("/admin/unauthorized");
  }

  return { supabase: ctx.supabase, user: ctx.user, adminUser: ctx.adminUser };
}

type ActionGuardResult =
  | { ok: true; ctx: ActiveAdminContext }
  | { ok: false; message: string };

/** Guard for Server Actions: returns a result instead of redirecting. */
export async function requireAdminForAction(): Promise<ActionGuardResult> {
  const ctx = await getAdminRequestContext();
  if (!ctx.user) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }
  if (!ctx.adminUser) {
    return { ok: false, message: "This account doesn't have staff access." };
  }
  return { ok: true, ctx: { supabase: ctx.supabase, user: ctx.user, adminUser: ctx.adminUser } };
}

/** Owner or manager only (staff management). */
export async function requireManagerForAction(): Promise<ActionGuardResult> {
  const result = await requireAdminForAction();
  if (!result.ok) return result;
  if (!canManageStaff(result.ctx.adminUser)) {
    return { ok: false, message: "Only owners and managers can manage staff." };
  }
  return result;
}
