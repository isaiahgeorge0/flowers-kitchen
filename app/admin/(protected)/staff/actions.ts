"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { requireManagerForAction } from "@/lib/admin/guards";
import { staffCreatedMetadata } from "@/lib/admin/password-metadata";
import { isAdminRole, type AdminActionState, type AdminRole } from "@/lib/admin/types";
import { supabase as secretClient } from "@/lib/supabase-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_LENGTH = { min: 2, max: 120 };
const PASSWORD_LENGTH = { min: 8, max: 128 };

const fail = (message: string, values?: Record<string, string>): AdminActionState => ({
  ok: false,
  message,
  at: Date.now(),
  values,
});
const success = (message: string): AdminActionState => ({ ok: true, message, at: Date.now() });

function parseRole(raw: FormDataEntryValue | null): AdminRole | null {
  const value = String(raw ?? "").trim();
  return isAdminRole(value) ? value : null;
}

/**
 * Feature permissions follow the role. Operations staff run the kitchen board (orders, sold out,
 * rice options, the ordering switch) and the leads; prices, hours and lead time need menus.
 */
function permissionsFor(role: AdminRole) {
  const full = role !== "operations";
  return {
    can_manage_menus: full,
    can_manage_orders: true,
    can_manage_events: full,
    can_manage_catering: true,
  };
}

async function countActiveOwners(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("role", "owner")
    .eq("is_active", true);
  return data?.length ?? 0;
}

export async function createStaffAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireManagerForAction();
  if (!auth.ok) return fail(auth.message);

  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 300);
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));
  const typed = { fullName, email, role: role ?? "operations" };

  if (fullName.length < NAME_LENGTH.min || fullName.length > NAME_LENGTH.max) {
    return fail(`Enter a name between ${NAME_LENGTH.min} and ${NAME_LENGTH.max} characters.`, typed);
  }
  if (!EMAIL_RE.test(email) || email.length > 254) return fail("Enter a valid email address.", typed);
  if (password.length < PASSWORD_LENGTH.min || password.length > PASSWORD_LENGTH.max) {
    return fail(
      `The temporary password needs ${PASSWORD_LENGTH.min} to ${PASSWORD_LENGTH.max} characters.`,
      typed,
    );
  }
  if (!role) return fail("Choose a role.", typed);
  if (role === "owner" && auth.ctx.adminUser.role !== "owner") {
    return fail("Only an owner can add another owner.", typed);
  }

  // Existing logins are never taken over or have their password reset from here.
  const { data: created, error: createError } = await secretClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: staffCreatedMetadata(fullName),
  });

  if (createError || !created.user) {
    if (createError?.code === "weak_password") {
      return fail("That temporary password is too easy to guess. Try a longer one.", typed);
    }
    if (createError?.code === "email_exists" || createError?.status === 422) {
      return fail(
        "That email already has a login. If they're listed below, change their access there.",
        typed,
      );
    }
    return fail("We couldn't create that login. Try again.", typed);
  }

  const userId = created.user.id;

  const { error: profileError } = await secretClient
    .from("profiles")
    .insert({ id: userId, email, full_name: fullName, is_active: true });

  const { error: staffError } = profileError
    ? { error: profileError }
    : await secretClient
        .from("admin_users")
        .insert({ profile_id: userId, role, is_active: true, ...permissionsFor(role) });

  if (staffError) {
    await secretClient.auth.admin.deleteUser(userId);
    return fail("We couldn't finish setting up that login. Try again.", typed);
  }

  refresh();
  return success(
    `${fullName} can now sign in at /admin with the temporary password. Share it privately; they'll be asked to change it.`,
  );
}

export async function updateStaffAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireManagerForAction();
  if (!auth.ok) return fail(auth.message);
  const { supabase, user, adminUser } = auth.ctx;

  const staffId = String(formData.get("staffId") ?? "").trim();
  if (!UUID_RE.test(staffId)) return fail("We couldn't find that staff member.");

  const role = parseRole(formData.get("role"));
  if (!role) return fail("Choose a role.");
  const isActive = formData.get("isActive") === "on";

  const { data: existing } = await supabase
    .from("admin_users")
    .select("id, role, is_active, profile_id")
    .eq("id", staffId)
    .maybeSingle<{ id: string; role: string; is_active: boolean; profile_id: string }>();
  if (!existing) return fail("We couldn't find that staff member.");

  if (adminUser.role !== "owner" && (existing.role === "owner" || role === "owner")) {
    return fail("Only an owner can change an owner's access.");
  }
  if (existing.profile_id === user.id && !isActive) {
    return fail("You can't switch off your own access.");
  }

  const ownerWillChange = existing.role === "owner" && existing.is_active && (role !== "owner" || !isActive);
  if (ownerWillChange && (await countActiveOwners(supabase)) <= 1) {
    return fail("There must always be at least one active owner.");
  }

  const { data: updated, error } = await supabase
    .from("admin_users")
    .update({ role, is_active: isActive, ...permissionsFor(role) })
    .eq("id", staffId)
    .select("id")
    .maybeSingle();

  if (error || !updated) return fail("We couldn't save those changes. Try again.");

  refresh();
  return success(isActive ? "Access saved." : "Access switched off. They can no longer sign in to admin.");
}
