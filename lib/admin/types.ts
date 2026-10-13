/** Mirrors the `admin_users.role` CHECK constraint. */
export type AdminRole = "owner" | "manager" | "operations";

export const ADMIN_ROLES: readonly AdminRole[] = ["owner", "manager", "operations"];

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  manager: "Manager",
  operations: "Operations",
};

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

/** Staff row mapped for the app (no secrets). */
export type AdminUser = {
  id: string;
  profileId: string;
  role: AdminRole;
  canManageMenus: boolean;
  canManageOrders: boolean;
  canManageEvents: boolean;
  canManageCatering: boolean;
};

/** Owners and managers manage staff; operations staff do day-to-day work only. */
export function canManageStaff(adminUser: Pick<AdminUser, "role">): boolean {
  return adminUser.role === "owner" || adminUser.role === "manager";
}

/** Result shape for admin form actions used with useActionState. */
export type AdminActionState = {
  ok: boolean;
  message: string;
  /** Changes on every submission so the UI can react to repeat results. */
  at: number;
  /**
   * What was submitted, returned on failure. React resets uncontrolled fields after every
   * form action, so forms use these as default values to keep what was typed. Never
   * include passwords.
   */
  values?: Record<string, string>;
};

export const idleActionState: AdminActionState = { ok: true, message: "", at: 0 };
