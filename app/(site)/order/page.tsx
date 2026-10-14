import type { Metadata } from "next";
import { InstagramLink } from "@/components/InstagramLink";
import { NumberedSteps } from "@/components/NumberedSteps";
import { OrderMenu } from "@/components/order/OrderMenu";
import { Section, SectionHeader } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { getMainMenu, getOrderingSettings } from "@/lib/ordering/menu";
import { orderSteps } from "@/lib/site";
import { h3 } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Order online",
  description: "Order your Jamaican box online and collect it from St Helen's Street, Ipswich. Halal, collection only.",
};

export default async function OrderPage() {
  const [boxes, settings] = await Promise.all([getMainMenu(), getOrderingSettings()]);

  return (
    <>
      {/* No reveal animation: its transform would pin the basket bar to this section. */}
      <Section reveal={false} first>
        <SectionHeader
          level={1}
          eyebrow="Order online"
          title="Choose your box."
          intro={"Pick your box and your rice, pay securely online, then collect from St\u00A0Helen's Street."}
        />
        <ServiceNote className="mt-5 text-muted" />

        <div className="mt-10">
          {boxes && boxes.length > 0 ? (
            <>
              <h2 className="sr-only">Boxes</h2>
              <OrderMenu boxes={boxes} settings={settings} />
            </>
          ) : (
            <div className="rounded-card border border-hairline bg-paper p-6 md:p-8">
              <p className={h3}>Online ordering is coming soon</p>
              <p className="mt-2 text-muted">In the meantime, follow us on Instagram for news.</p>
              <InstagramLink className="mt-2" />
            </div>
          )}
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Three steps" title="How it works" tone="paper" />
        <NumberedSteps steps={orderSteps} className="mt-10" />
        <p className="mt-16 max-w-measure text-[15px] text-muted">
          Allergies? Check the allergens on each box before you order, and tell us in the note at checkout.
        </p>
      </Section>
    </>
  );
}
