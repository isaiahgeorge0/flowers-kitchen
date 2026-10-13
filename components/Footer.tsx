import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { address, instagram, navLinks, openingHours } from "@/lib/site";
import { Eyebrow } from "./Eyebrow";
import { NavLink } from "./NavLink";
import { ServiceNote } from "./ServiceNote";

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const linkClasses =
  "inline-flex min-h-11 items-center decoration-allspice decoration-1 underline-offset-[6px] hover:underline";

export function Footer() {
  return (
    <footer className="bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)]">
      <div className="mx-auto grid max-w-content gap-12 px-6 py-16 md:grid-cols-2 md:px-8 md:py-24 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-block">
            <Image
              src="/brand/flowers-kitchen_primary_reverse-green.svg"
              alt="Flowers Kitchen"
              width={545}
              height={477}
              className="h-auto w-44"
            />
          </Link>
        </div>

        <nav aria-label="Footer">
          <Eyebrow as="h2" tone="mountain" className="mb-5">
            Explore
          </Eyebrow>
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} className={linkClasses}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <Eyebrow as="h2" tone="mountain" className="mb-5">
            Visit
          </Eyebrow>
          <address className="not-italic">
            <p>{address}</p>
            <ServiceNote className="mt-2 text-mountain-muted" />
            <a
              href={instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClasses} mt-2`}
            >
              {instagram.handle}
              <span className="sr-only"> on Instagram (opens in a new tab)</span>
            </a>
          </address>
        </div>

        <div>
          <Eyebrow as="h2" tone="mountain" className="mb-5">
            Opening hours
          </Eyebrow>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[15px]">
            {openingHours.map(({ day, hours }) => (
              <div key={day} className="contents">
                <dt className="text-mountain-muted">{day}</dt>
                <dd>{hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-allspice">
        <p className="mx-auto max-w-content px-6 py-6 text-[13px] text-mountain-muted md:px-8">
          © <CurrentYear /> Flowers Kitchen. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
