import { MapPin, Phone } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { openingHoursRows } from "@/lib/ordering/hours";
import { getOrderingSettings } from "@/lib/ordering/menu";
import { address, instagram, navLinks, orderHref, phone } from "@/lib/site";
import { BrandLogo } from "./BrandLogo";
import { Eyebrow } from "./Eyebrow";
import { NavLink } from "./NavLink";
import { ServiceNote } from "./ServiceNote";

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

async function FooterHours() {
  const { openingHours } = await getOrderingSettings();
  return (
    <dl className="mt-6 grid max-w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[15px]">
      {openingHoursRows(openingHours).map(({ day, hours }) => (
        <div key={day} className="contents">
          <dt className="text-mountain-muted">{day}</dt>
          <dd className="text-right tabular-nums">{hours}</dd>
        </div>
      ))}
    </dl>
  );
}

const linkClasses =
  "inline-flex min-h-11 items-center decoration-allspice decoration-1 underline-offset-[6px] hover:underline";

const footerLinks = [{ href: orderHref, label: "Order online" }, ...navLinks];

export function Footer() {
  return (
    <footer className="bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)]">
      <div className="mx-auto grid max-w-content gap-14 px-6 py-20 md:grid-cols-2 md:px-8 md:py-28 lg:grid-cols-[1.3fr_0.8fr_1fr] lg:gap-16">
        <div className="md:col-span-2 lg:col-span-1">
          <Link href="/" className="inline-block">
            <BrandLogo
              src="/brand/flowers-kitchen_primary_reverse-green.svg"
              width={545}
              height={477}
              className="h-auto w-40"
            />
          </Link>
          <p className="mt-8 max-w-xs font-display text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-balance">
            Jamaican family recipes, cooked by the next generation.
          </p>
          <ServiceNote className="mt-6 text-mountain-muted" />
        </div>

        <nav aria-label="Footer">
          <Eyebrow as="h2" tone="mountain" rules>
            Explore
          </Eyebrow>
          <ul className="mt-5">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} className={linkClasses}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <a href={instagram.url} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                {instagram.handle}
                <span className="sr-only"> on Instagram (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <Eyebrow as="h2" tone="mountain" rules>
            Visit
          </Eyebrow>
          <address className="mt-5 not-italic">
            <p className="flex min-h-11 items-center gap-3">
              <MapPin aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-allspice" />
              {address}
            </p>
            <a href={phone.href} className={`${linkClasses} gap-3 tabular-nums`}>
              <Phone aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-allspice" />
              <span>
                <span className="sr-only">Call us on </span>
                {phone.display}
              </span>
            </a>
          </address>
          <h3 className="mt-8 text-[15px] font-semibold">Opening hours</h3>
          <FooterHours />
        </div>
      </div>

      <div className="border-t border-allspice/40">
        <div className="mx-auto flex max-w-content flex-col gap-2 px-6 py-5 text-[13px] text-mountain-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>
            © <CurrentYear /> Flowers Kitchen. All rights reserved.
          </p>
          <ul className="flex gap-6">
            <li>
              <Link href="/privacy" className={linkClasses}>
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClasses}>
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
