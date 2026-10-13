import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/admin/AuthCard";
import { SignInForm } from "@/components/admin/SignInForm";
import { getAdminRequestContext } from "@/lib/admin/context";
import { safeAdminNextPath } from "@/lib/admin/paths";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/admin/sign-in">) {
  return (
    <AuthCard eyebrow="Staff only" title="Sign in">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <SignInGate searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function SignInGate({ searchParams }: Pick<PageProps<"/admin/sign-in">, "searchParams">) {
  const { next: rawNext } = await searchParams;
  const next = safeAdminNextPath(typeof rawNext === "string" ? rawNext : undefined);

  const ctx = await getAdminRequestContext();
  if (ctx.adminUser) redirect(next);
  if (ctx.user) redirect("/admin/unauthorized");

  return <SignInForm nextPath={next} />;
}
