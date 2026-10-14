import { signOutAction } from "@/lib/admin/auth-actions";

export function SignOutButton({ tone = "mountain" }: { tone?: "mountain" | "light" }) {
  const colours =
    tone === "mountain"
      ? "border-cream text-cream hover:bg-cream hover:text-mountain"
      : "border-pimento text-pimento hover:bg-pimento hover:text-cream";

  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={`inline-flex min-h-11 w-full items-center justify-center rounded-pill border px-4 text-[15px] font-semibold uppercase leading-none tracking-[0.08em] transition-colors duration-300 ease-out ${colours}`}
      >
        Sign out
      </button>
    </form>
  );
}
