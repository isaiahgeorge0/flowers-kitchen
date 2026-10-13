import type { Metadata } from "next";
import { AuthCard } from "@/components/admin/AuthCard";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const metadata: Metadata = { title: "No staff access" };

export default function UnauthorizedPage() {
  return (
    <AuthCard eyebrow="Staff only" title="No staff access">
      <p className="text-muted">
        You&rsquo;re signed in, but this account isn&rsquo;t set up as Flowers Kitchen staff. Ask an
        owner or manager to add you, then sign in again.
      </p>
      <div className="mt-6">
        <SignOutButton tone="light" />
      </div>
    </AuthCard>
  );
}
