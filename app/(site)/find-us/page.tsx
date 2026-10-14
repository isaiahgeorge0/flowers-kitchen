import { Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { InstagramLink } from "@/components/InstagramLink";
import { MapCard } from "@/components/MapCard";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { Section, SectionHeader } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { addressHeading, orderHref, orderSteps, phone } from "@/lib/site";
import { h3, textLink } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Find Us",
  description:
    "Find Flowers Kitchen on St Helen's Street, Ipswich. Opening hours, how to order online and collect, and answers to common questions.",
};

const faqs: { question: string; answer: ReactNode }[] = [
  { question: "Is the food halal?", answer: "Yes, all our food is halal." },
  {
    question: "Do you deliver?",
    answer: "Not at the moment — we're collection only.",
  },
  {
    question: "Can I order in advance?",
    answer: (
      <>
        Yes —{" "}
        <Link href={orderHref} className="underline decoration-sorrel underline-offset-4">
          order online
        </Link>{" "}
        and we&apos;ll have it ready to collect.
      </>
    ),
  },
  {
    question: "Do you do catering?",
    answer: (
      <>
        We do. Tell us about your event on our{" "}
        <Link href="/catering" className="underline decoration-sorrel underline-offset-4">
          catering page
        </Link>
        .
      </>
    ),
  },
];

export default function FindUsPage() {
  return (
    <>
      <Section first className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <SectionHeader
            level={1}
            eyebrow="Find us"
            title={addressHeading}
            intro={
              <>
                Collection only.{" "}
                <Link href={orderHref} className="font-semibold text-pimento underline decoration-sorrel underline-offset-4">
                  Order online
                </Link>{" "}
                and collect from us.
              </>
            }
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-8">
            <a href={phone.href} className={`${textLink} gap-2.5 decoration-sorrel tabular-nums`}>
              <Phone aria-hidden strokeWidth={1.5} className="size-[18px] text-sorrel" />
              <span>
                <span className="sr-only">Call us on </span>
                {phone.display}
              </span>
            </a>
            <InstagramLink />
          </div>

          <h2 className={`mt-12 ${h3}`}>Opening hours</h2>
          <OpeningHoursTable className="mt-4 max-w-md" />

          <h2 className={`mt-12 ${h3}`}>How to order</h2>
          <ol className="mt-5 flex flex-col gap-4">
            {orderSteps.map((step, i) => (
              <li key={step} className="flex items-center gap-4">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-hairline font-display text-lg font-semibold text-sorrel"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <ServiceNote className="mt-10 text-muted" />
        </div>

        <MapCard className="aspect-4/5 sm:aspect-4/3 lg:aspect-auto lg:h-full lg:min-h-[36rem]" />
      </Section>

      <Section tone="paper">
        <div className="mx-auto max-w-3xl">
          <SectionHeader tone="paper" eyebrow="Good to know" title="Frequently asked questions" />
          <div className="mt-10 border-t border-hairline">
            {faqs.map((faq) => (
              <details key={faq.question} className="group border-b border-hairline">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-[22px] font-semibold leading-snug md:text-2xl [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-hairline text-sorrel transition-colors duration-300 ease-out group-open:border-sorrel">
                    <Plus aria-hidden strokeWidth={1.5} className="size-[18px] transition-transform duration-300 ease-out group-open:rotate-45" />
                  </span>
                </summary>
                <p className="max-w-measure pb-6 text-lg">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
