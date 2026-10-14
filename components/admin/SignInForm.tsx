"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/lib/admin/auth-actions";
import { SubmitButton } from "./ActionUi";
import { adminInput, adminLabel } from "./AdminUi";

const initialState: SignInState = { ok: true };

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <label htmlFor="admin-email" className={adminLabel}>
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.ok ? "" : state.email}
          className={adminInput}
        />
      </div>
      <div>
        <label htmlFor="admin-password" className={adminLabel}>
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={adminInput}
        />
      </div>
      <div aria-live="polite">
        {!state.ok && (
          <p role="alert" className="rounded-card border border-sorrel bg-cream px-4 py-3 text-[15px] text-sorrel">
            {state.message}
          </p>
        )}
      </div>
      <SubmitButton size="md" pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
