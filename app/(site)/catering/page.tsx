import type { Metadata } from "next";
import { CateringBuilder } from "@/components/catering/CateringBuilder";
import { NumberedSteps } from "@/components/NumberedSteps";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeader } from "@/components/Section";

export const metadata: Metadata = { title: "Catering" };

const howItWorks = [
  "Build your event",
  "We send your quote",
  "We cook, you celebrate",
];

export default function CateringPage() {
  return (
    <>
      <Section reveal={false} first>
        <Reveal>
          <SectionHeader
            level={1}
            eyebrow="Catering"
            title="Plan your event."
            intro="Tell us about your occasion and watch it come together. We'll come back to you with a quote."
          />
        </Reveal>

        <div className="mt-10 md:mt-14">
          <CateringBuilder />
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Three steps" title="How it works" tone="paper" />
        <NumberedSteps steps={howItWorks} className="mt-10" />
      </Section>
    </>
  );
}
