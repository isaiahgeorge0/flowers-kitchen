export type AdminNavItem =
  | { label: string; href: string; comingSoon?: false }
  | { label: string; comingSoon: true };

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Catering leads", href: "/admin/leads" },
  { label: "Staff", href: "/admin/staff" },
  { label: "Profile", href: "/admin/profile" },
  { label: "Orders", comingSoon: true },
  { label: "Menu", comingSoon: true },
  { label: "Settings", comingSoon: true },
];

export function isNavItemActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
