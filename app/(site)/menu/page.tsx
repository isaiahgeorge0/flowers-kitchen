import type { Metadata } from "next";
import { BoxCard } from "@/components/BoxCard";
import { NumberedSteps } from "@/components/NumberedSteps";
import { Section, SectionHeader } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { SidesSentence } from "@/components/SidesSentence";
import { BOXES } from "@/lib/menu";
import { boxPriceLabels } from "@/lib/ordering/menu";
import { orderSteps } from "@/lib/site";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Jerk chicken, curry goat, fried fish and more. Every box comes with rice & peas or white rice, mac & cheese, festival and coleslaw. Halal, collection only.",
};

export default async function MenuPage() {
  const prices = await boxPriceLabels();
  return (
    <>
      <Section first>
        <SectionHeader level={1} eyebrow="The menu" title="Pick your box." intro={<SidesSentence />} />
        <ServiceNote className="mt-5 text-muted" />

        <h2 className="sr-only">All boxes</h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BOXES.map((box) => (
            <li key={box.slug}>
              <BoxCard box={box} price={prices[box.slug]} />
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Three steps" title="How to order" tone="paper" />
        <NumberedSteps steps={orderSteps} className="mt-10" />

        <p className="mt-16 max-w-measure text-[15px] text-muted">
          Allergies? Please tell us before you order and ask us about allergens
          in any box.
        </p>
      </Section>
    </>
  );
}
