import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, AdminPageHeader, adminCard } from "@/components/admin/AdminUi";
import { ProfilePanel } from "@/components/admin/ProfilePanel";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { ROLE_LABELS } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <AdminPageHeader eyebrow="Your account" title="Profile" />
      <Suspense fallback={<AdminLoading />}>
        <ProfileContent />
      </Suspense>
    </>
  );
}

async function ProfileContent() {
  const { supabase, user, adminUser } = await requireActiveAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null }>();

  const displayName = profile?.full_name?.trim() || user.displayName || "";

  return (
    <>
      <dl className={`${adminCard} mb-6 grid gap-4 p-6 sm:grid-cols-2`}>
        <div>
          <dt className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">Email</dt>
          <dd className="mt-1 break-all">{user.email ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">Role</dt>
          <dd className="mt-1">{ROLE_LABELS[adminUser.role]}</dd>
        </div>
      </dl>
      <ProfilePanel displayName={displayName} />
    </>
  );
}
