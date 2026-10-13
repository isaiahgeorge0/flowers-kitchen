const DEFAULT_ADMIN_LANDING = "/admin";

function hasAsciiControlOrNul(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

/**
 * Prevents open redirects: only same-origin admin paths are allowed after sign-in.
 * Rejects path traversal, backslashes, protocol-relative URLs and control characters.
 */
export function safeAdminNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return DEFAULT_ADMIN_LANDING;
  const t = raw.trim();
  if (t.length === 0 || t.length > 512) return DEFAULT_ADMIN_LANDING;
  if (hasAsciiControlOrNul(t) || t.includes("..") || t.includes("\\")) return DEFAULT_ADMIN_LANDING;
  if (!t.startsWith("/admin/")) return DEFAULT_ADMIN_LANDING;
  if (t.startsWith("//") || t.includes("://")) return DEFAULT_ADMIN_LANDING;
  if (t.startsWith("/admin/sign-in") || t.startsWith("/admin/unauthorized")) {
    return DEFAULT_ADMIN_LANDING;
  }
  return t;
}
