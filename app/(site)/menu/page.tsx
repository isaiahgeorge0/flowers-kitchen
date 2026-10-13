import type { Metadata } from "next";
import { BoxCard } from "@/components/BoxCard";
import { Eyebrow } from "@/components/Eyebrow";
import { NumberedSteps } from "@/components/NumberedSteps";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { SidesSentence } from "@/components/SidesSentence";
import { BOXES } from "@/lib/menu";
import { boxPriceLabels } from "@/lib/ordering/menu";
import { orderSteps } from "@/lib/site";
import { h1, h2 } from "@/lib/typography";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const prices = await boxPriceLabels();
  return (
    <>
      <Section>
        <div className="max-w-3xl">
          <Eyebrow>The menu</Eyebrow>
          <h1 className={`mt-6 ${h1}`}>Pick your box.</h1>
          <SidesSentence className="mt-4 text-lg text-muted" />
          <ServiceNote className="mt-3 text-[15px] text-muted" />
        </div>

        <h2 className="sr-only">All boxes</h2>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BOXES.map((box) => (
            <li key={box.slug}>
              <BoxCard box={box} price={prices[box.slug]} />
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="paper">
        <h2 className={h2}>How to order</h2>
        <NumberedSteps steps={orderSteps} className="mt-12" />

        <p className="mt-16 border-t border-hairline pt-8 text-[15px] text-muted">
          Allergies? Please tell us before you order and ask us about allergens
          in any box.
        </p>
      </Section>
    </>
  );
}
