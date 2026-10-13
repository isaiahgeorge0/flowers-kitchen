"use server";

import { refresh } from "next/cache";
import { requireAdminForAction } from "@/lib/admin/guards";
import { passwordChangedMetadata } from "@/lib/admin/password-metadata";
import type { AdminActionState } from "@/lib/admin/types";

const NAME_LENGTH = { min: 2, max: 120 };
const PASSWORD_LENGTH = { min: 8, max: 128 };

const fail = (message: string): AdminActionState => ({ ok: false, message, at: Date.now() });
const success = (message: string): AdminActionState => ({ ok: true, message, at: Date.now() });

export async function updateProfileNameAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return fail(auth.message);
  const { supabase, user } = auth.ctx;

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (fullName.length < NAME_LENGTH.min || fullName.length > NAME_LENGTH.max) {
    return fail(`Enter a name between ${NAME_LENGTH.min} and ${NAME_LENGTH.max} characters.`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (profileError) return fail("We couldn't save your name. Try again.");

  const { error: authError } = await supabase.auth.updateUser({
    data: { ...user.metadata, full_name: fullName },
  });
  if (authError) return fail("We couldn't save your name. Try again.");

  refresh();
  return success("Name saved.");
}

export async function updateProfilePasswordAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return fail(auth.message);
  const { supabase, user } = auth.ctx;

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) return fail("Enter your current password.");
  if (newPassword.length < PASSWORD_LENGTH.min || newPassword.length > PASSWORD_LENGTH.max) {
    return fail(`Your new password needs ${PASSWORD_LENGTH.min} to ${PASSWORD_LENGTH.max} characters.`);
  }
  if (newPassword !== confirmPassword) return fail("The new passwords don't match.");
  if (newPassword === currentPassword) return fail("Choose a password different from your current one.");
  if (!user.email) return fail("We couldn't change your password. Try again.");

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) return fail("Your current password isn't right.");

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: passwordChangedMetadata(user.metadata),
  });

  if (error) {
    if (error.code === "weak_password") return fail("That password is too easy to guess. Try a longer one.");
    if (error.code === "same_password") return fail("Choose a password different from your current one.");
    return fail("We couldn't change your password. Try again.");
  }

  refresh();
  return success("Password changed.");
}
