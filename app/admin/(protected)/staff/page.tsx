import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, AdminPageHeader } from "@/components/admin/AdminUi";
import { StaffPanel } from "@/components/admin/StaffPanel";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { fetchStaffRows } from "@/lib/admin/staff";
import { canManageStaff } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <>
      <AdminPageHeader eyebrow="Team" title="Staff">
        Who can sign in to the admin area, and what they can do.
      </AdminPageHeader>
      <Suspense fallback={<AdminLoading />}>
        <StaffContent />
      </Suspense>
    </>
  );
}

async function StaffContent() {
  const { supabase, adminUser } = await requireActiveAdmin();
  const rows = await fetchStaffRows(supabase);

  return (
    <StaffPanel
      rows={rows.map(({ id, profileId, email, fullName, role, isActive }) => ({
        id,
        profileId,
        email,
        fullName,
        role,
        isActive,
      }))}
      canManage={canManageStaff(adminUser)}
      actorIsOwner={adminUser.role === "owner"}
      actorProfileId={adminUser.profileId}
    />
  );
}
