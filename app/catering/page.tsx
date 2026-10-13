import type { Metadata } from "next";
import { CateringBuilder } from "@/components/catering/CateringBuilder";
import { Eyebrow } from "@/components/Eyebrow";
import { NumberedSteps } from "@/components/NumberedSteps";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { h1, h2 } from "@/lib/typography";

export const metadata: Metadata = { title: "Catering" };

const howItWorks = [
  "Build your event",
  "We send your quote",
  "We cook, you celebrate",
];

export default function CateringPage() {
  return (
    <>
      <Section reveal={false}>
        <Reveal className="max-w-3xl">
          <Eyebrow>Catering</Eyebrow>
          <h1 className={`mt-6 ${h1}`}>Plan your event.</h1>
          <p className="mt-6 text-lg text-muted">
            Tell us about your occasion and watch it come together. We&apos;ll
            come back to you with a quote.
          </p>
        </Reveal>

        <div className="mt-12 md:mt-16">
          <CateringBuilder />
        </div>
      </Section>

      <Section tone="paper">
        <h2 className={h2}>How it works</h2>
        <NumberedSteps steps={howItWorks} className="mt-12" />
      </Section>
    </>
  );
}
