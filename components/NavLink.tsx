"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ComponentProps } from "react";

type NavLinkProps = ComponentProps<typeof Link> & { href: string };

// The pathname isn't known while prerendering routes with dynamic params (the order
// confirmation page), so those render the plain link until it resolves.
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <CurrentAwareLink {...props} />
    </Suspense>
  );
}

function CurrentAwareLink({ href, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);

  return <Link href={href} aria-current={current ? "page" : undefined} {...props} />;
}
