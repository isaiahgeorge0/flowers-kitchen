"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, isNavItemActive, type NavAccess } from "@/lib/admin/nav";

/** Admin links for the mountain-green sidebar and mobile drawer. */
export function AdminNavList({ access, onNavigate }: { access: NavAccess; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {ADMIN_NAV.filter((item) => !item.requires || access[item.requires]).map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center border-l-2 px-4 text-[16px] transition-colors duration-300 ease-out ${
                active
                  ? "border-allspice font-semibold text-cream"
                  : "border-transparent text-mountain-muted hover:text-cream"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
