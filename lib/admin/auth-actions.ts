"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeAdminNextPath } from "@/lib/admin/paths";
import { createAdminSessionClient } from "@/lib/admin/supabase";

/** On failure the email comes back so the form can keep it; the password never does. */
export type SignInState = { ok: true } | { ok: false; message: string; email: string };

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const password = String(formData.get("password") ?? "");
  const next = safeAdminNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { ok: false, message: "Enter your email and password.", email };
  }

  const supabase = await createAdminSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: "That email and password don't match. Try again.", email };
  }

  revalidatePath("/admin", "layout");
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createAdminSessionClient();
  await supabase.auth.signOut();
  revalidatePath("/admin", "layout");
  redirect("/admin/sign-in");
}
