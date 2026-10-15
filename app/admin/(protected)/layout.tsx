import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminNavList } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { navAccess } from "@/lib/admin/nav";
import { ROLE_LABELS } from "@/lib/admin/types";

export default function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, adminUser } = await requireActiveAdmin();
  const displayName = user.displayName ?? user.email ?? "Staff";
  const roleLabel = ROLE_LABELS[adminUser.role];
  const access = navAccess(adminUser);

  // The kitchen board (data-kitchen) brings its own top bar: below 1440px the sidebar steps aside
  // so the four columns fit on a landscape tablet.
  return (
    <div className="group/shell flex flex-1 flex-col lg:flex-row">
      <AdminMobileNav
        displayName={displayName}
        roleLabel={roleLabel}
        signOutSlot={<SignOutButton />}
        access={access}
      />

      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)] lg:flex group-has-[[data-kitchen]]/shell:max-[1440px]:hidden">
        <Link href="/admin" className="block px-8 pb-8 pt-10">
          <Image
            src="/brand/flowers-kitchen_horizontal_reverse-green.svg"
            alt="Flowers Kitchen"
            width={678}
            height={231}
            loading="eager"
            className="h-auto w-44"
          />
        </Link>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-4">
          <AdminNavList access={access} />
        </nav>
        <div className="border-t border-allspice px-8 py-6">
          <p className="truncate font-semibold">{displayName}</p>
          <p className="text-[15px] text-mountain-muted">{roleLabel}</p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main
        id="main"
        className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-12 group-has-[[data-kitchen]]/shell:max-[1440px]:px-4 group-has-[[data-kitchen]]/shell:max-[1440px]:pt-0"
      >
        <div className="mx-auto max-w-5xl has-[[data-wide]]:max-w-[1600px]">
          {user.mustChangePassword && (
            <div className="mb-8 rounded-card border border-hairline border-l-sorrel border-l-4 bg-paper px-5 py-4">
              <p className="font-semibold">You&rsquo;re using a temporary password.</p>
              <p className="mt-1 text-muted">
                Choose your own on your{" "}
                <Link href="/admin/profile" className="font-semibold text-pimento underline underline-offset-4">
                  profile
                </Link>
                .
              </p>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="h-16 bg-mountain lg:h-dvh lg:w-72" />
      <div className="flex-1 px-5 py-8 md:px-10 md:py-12">
        <p className="text-muted">Loading…</p>
      </div>
    </div>
  );
}
