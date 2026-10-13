"use client";

import { useActionState } from "react";
import {
  updateProfileNameAction,
  updateProfilePasswordAction,
} from "@/app/admin/(protected)/profile/actions";
import { idleActionState } from "@/lib/admin/types";
import { ActionFeedback, SubmitButton } from "./ActionUi";
import { adminCard, adminH2, adminInput, adminLabel } from "./AdminUi";

export function ProfilePanel({ displayName }: { displayName: string }) {
  const [nameState, nameAction] = useActionState(updateProfileNameAction, idleActionState);
  const [passwordState, passwordAction] = useActionState(updateProfilePasswordAction, idleActionState);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={`${adminCard} p-6`} aria-labelledby="name-heading">
        <h2 id="name-heading" className={adminH2}>
          Your name
        </h2>
        <p className="mt-2 text-muted">Shown in the admin area and on the staff list.</p>
        <form action={nameAction} className="mt-6 flex flex-col gap-5">
          <div>
            <label htmlFor="profile-name" className={adminLabel}>
              Name
            </label>
            <input
              id="profile-name"
              name="fullName"
              defaultValue={displayName}
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              className={adminInput}
            />
          </div>
          <ActionFeedback state={nameState} />
          <div>
            <SubmitButton>Save name</SubmitButton>
          </div>
        </form>
      </section>

      <section className={`${adminCard} p-6`} aria-labelledby="password-heading">
        <h2 id="password-heading" className={adminH2}>
          Change password
        </h2>
        <p className="mt-2 text-muted">At least 8 characters. A short phrase is easier to remember.</p>
        <form action={passwordAction} className="mt-6 flex flex-col gap-5">
          <div>
            <label htmlFor="current-password" className={adminLabel}>
              Current password
            </label>
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className={adminInput}
            />
          </div>
          <div>
            <label htmlFor="new-password" className={adminLabel}>
              New password
            </label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className={adminInput}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className={adminLabel}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className={adminInput}
            />
          </div>
          <ActionFeedback state={passwordState} />
          <div>
            <SubmitButton>Change password</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
