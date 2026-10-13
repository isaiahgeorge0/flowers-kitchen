"use client";

import { useActionState } from "react";
import { createStaffAction, updateStaffAction } from "@/app/admin/(protected)/staff/actions";
import { ADMIN_ROLES, idleActionState, isAdminRole, ROLE_LABELS, type AdminRole } from "@/lib/admin/types";
import { ActionFeedback, SubmitButton } from "./ActionUi";
import { adminCard, adminH2, adminInput, adminLabel } from "./AdminUi";

export type StaffPanelRow = {
  id: string;
  profileId: string;
  email: string | null;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
};

function RoleSelect({
  id,
  defaultRole,
  allowOwner,
  disabled = false,
}: {
  id: string;
  defaultRole: AdminRole;
  allowOwner: boolean;
  disabled?: boolean;
}) {
  const roles = allowOwner || defaultRole === "owner" ? ADMIN_ROLES : ADMIN_ROLES.filter((r) => r !== "owner");
  return (
    <select id={id} name="role" defaultValue={defaultRole} disabled={disabled} className={adminInput}>
      {roles.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

function StaffRowEditor({
  row,
  canManage,
  actorIsOwner,
  isSelf,
}: {
  row: StaffPanelRow;
  canManage: boolean;
  actorIsOwner: boolean;
  isSelf: boolean;
}) {
  const [state, action] = useActionState(updateStaffAction, idleActionState);
  const editable = canManage && (actorIsOwner || row.role !== "owner");
  const name = row.fullName?.trim() || "Unnamed";

  return (
    <li className={`${adminCard} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {name}
            {isSelf && <span className="font-normal text-muted"> (you)</span>}
          </p>
          <p className="break-all text-[15px] text-muted">{row.email ?? "No email on file"}</p>
        </div>
        <span
          className={`inline-flex min-h-7 items-center rounded-sm border px-2.5 text-[13px] font-semibold uppercase leading-none tracking-[0.08em] ${
            row.isActive ? "border-mountain bg-mountain text-cream" : "border-hairline bg-cream text-muted"
          }`}
        >
          {row.isActive ? ROLE_LABELS[row.role] : "No access"}
        </span>
      </div>

      {editable ? (
        <form action={action} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="staffId" value={row.id} />
          <div>
            <label htmlFor={`role-${row.id}`} className={adminLabel}>
              Role
            </label>
            <RoleSelect id={`role-${row.id}`} defaultRole={row.role} allowOwner={actorIsOwner} />
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px] font-semibold has-disabled:cursor-not-allowed has-disabled:opacity-60">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={row.isActive}
              disabled={isSelf}
              className="size-5 accent-sorrel"
            />
            Can sign in
            {isSelf && <input type="hidden" name="isActive" value="on" />}
          </label>
          <ActionFeedback state={state} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <SubmitButton variant="secondary">Save access</SubmitButton>
          </div>
        </form>
      ) : (
        canManage && (
          <p className="mt-4 text-[15px] text-muted">Only an owner can change an owner&rsquo;s access.</p>
        )
      )}
    </li>
  );
}

export function StaffPanel({
  rows,
  canManage,
  actorIsOwner,
  actorProfileId,
}: {
  rows: StaffPanelRow[];
  canManage: boolean;
  actorIsOwner: boolean;
  actorProfileId: string;
}) {
  const [createState, createAction] = useActionState(createStaffAction, idleActionState);
  const typed = createState.ok ? undefined : createState.values;
  const typedRole = typed?.role && isAdminRole(typed.role) ? typed.role : "operations";

  return (
    <div className="flex flex-col gap-10">
      {canManage ? (
        <section className={`${adminCard} p-6`} aria-labelledby="add-staff-heading">
          <h2 id="add-staff-heading" className={adminH2}>
            Add a staff member
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            This creates their login straight away. Give them the temporary password in person or by
            phone; they&rsquo;ll be asked to choose their own when they first sign in.
          </p>
          <form action={createAction} className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="staff-name" className={adminLabel}>
                Full name
              </label>
              <input
                id="staff-name"
                name="fullName"
                defaultValue={typed?.fullName ?? ""}
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
                className={adminInput}
              />
            </div>
            <div>
              <label htmlFor="staff-email" className={adminLabel}>
                Email
              </label>
              <input
                id="staff-email"
                name="email"
                defaultValue={typed?.email ?? ""}
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                className={adminInput}
              />
            </div>
            <div>
              <label htmlFor="staff-password" className={adminLabel}>
                Temporary password
              </label>
              <input
                id="staff-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className={adminInput}
              />
            </div>
            <div>
              <label htmlFor="staff-role" className={adminLabel}>
                Role
              </label>
              <RoleSelect id="staff-role" defaultRole={typedRole} allowOwner={actorIsOwner} />
              <p className="mt-2 text-[15px] text-muted">
                Owners can do everything. Managers can do everything except change owners.
                Operations run the kitchen board and leads, mark boxes sold out and switch
                ordering on or off, but can&rsquo;t change prices or opening hours.
              </p>
            </div>
            <ActionFeedback state={createState} className="md:col-span-2" />
            <div className="md:col-span-2">
              <SubmitButton pendingLabel="Adding…">Add staff member</SubmitButton>
            </div>
          </form>
        </section>
      ) : (
        <p className={`${adminCard} px-5 py-4 text-muted`}>
          Only owners and managers can add staff or change access.
        </p>
      )}

      <section aria-labelledby="team-heading">
        <h2 id="team-heading" className={adminH2}>
          The team
        </h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-muted">No staff yet.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-4">
            {rows.map((row) => (
              <StaffRowEditor
                key={row.id}
                row={row}
                canManage={canManage}
                actorIsOwner={actorIsOwner}
                isSelf={row.profileId === actorProfileId}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
