import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/Eyebrow";
import { InstagramLink } from "@/components/InstagramLink";
import { MapEmbed } from "@/components/MapEmbed";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { address, orderHref, orderSteps } from "@/lib/site";
import { h1, h2, h3 } from "@/lib/typography";

export const metadata: Metadata = { title: "Find Us" };

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
      <Section className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <Eyebrow>Find us</Eyebrow>
          <h1 className={`mt-6 ${h1}`}>{address}</h1>
          <p className="mt-6 text-lg">
            Collection only.{" "}
            <Link href={orderHref} className="font-semibold underline decoration-sorrel underline-offset-4">
              Order online
            </Link>{" "}
            and collect from us.
          </p>
          <InstagramLink className="text-lg" />

          <h2 className={`mt-12 ${h3}`}>Opening hours</h2>
          <OpeningHoursTable className="mt-4 max-w-md" />

          <h2 className={`mt-12 ${h3}`}>How to order</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {orderSteps.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span
                  aria-hidden
                  className="w-6 shrink-0 font-display text-2xl font-semibold leading-[1.1] text-sorrel"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <ServiceNote className="mt-10 text-[15px] text-muted" />
        </div>

        <MapEmbed className="aspect-4/5 sm:aspect-4/3 lg:aspect-auto lg:h-full lg:min-h-[36rem]" />
      </Section>

      <Section tone="paper">
        <div className="mx-auto max-w-3xl">
          <h2 className={h2}>Frequently asked questions</h2>
          <div className="mt-10 border-t border-hairline">
            {faqs.map((faq) => (
              <details key={faq.question} className="group border-b border-hairline">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-[22px] font-semibold leading-snug md:text-2xl [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="size-5 shrink-0 text-sorrel"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 12h16" />
                    <path d="M12 4v16" className="group-open:hidden" />
                  </svg>
                </summary>
                <p className="max-w-2xl pb-6 text-lg">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
