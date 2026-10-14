import type { AdminUser } from "@/lib/admin/types";

export type NavAccess = { orders: boolean; menu: boolean; catering: boolean };

export type AdminNavItem = { label: string; href: string; requires?: keyof NavAccess };

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders", requires: "orders" },
  { label: "Menu", href: "/admin/menu", requires: "menu" },
  { label: "Settings", href: "/admin/settings", requires: "menu" },
  { label: "Catering leads", href: "/admin/leads", requires: "catering" },
  { label: "Staff", href: "/admin/staff" },
  { label: "Profile", href: "/admin/profile" },
];

/** Menu and Settings are open to kitchen staff too: they can mark boxes sold out and switch ordering. */
export function navAccess(adminUser: AdminUser): NavAccess {
  return {
    orders: adminUser.canManageOrders,
    menu: adminUser.canManageMenus || adminUser.canManageOrders,
    catering: adminUser.canManageCatering,
  };
}

export function isNavItemActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
