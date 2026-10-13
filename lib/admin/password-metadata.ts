/** Stored in Supabase Auth `user_metadata`, so no table column is needed. */
export const MUST_CHANGE_PASSWORD_KEY = "must_change_password";

export function readMustChangePassword(metadata: Record<string, unknown> | undefined): boolean {
  return metadata?.[MUST_CHANGE_PASSWORD_KEY] === true;
}

export function staffCreatedMetadata(fullName: string): Record<string, unknown> {
  return { full_name: fullName, [MUST_CHANGE_PASSWORD_KEY]: true };
}

export function passwordChangedMetadata(
  existing: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...(existing ?? {}), [MUST_CHANGE_PASSWORD_KEY]: false };
}
