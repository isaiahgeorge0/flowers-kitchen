import type { Metadata } from "next";
import { Eyebrow } from "@/components/Eyebrow";
import { InstagramLink } from "@/components/InstagramLink";
import { NumberedSteps } from "@/components/NumberedSteps";
import { OrderMenu } from "@/components/order/OrderMenu";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { getMainMenu, getOrderingSettings } from "@/lib/ordering/menu";
import { orderSteps } from "@/lib/site";
import { h1, h2 } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Order online",
  description: "Order your Jamaican box online and collect it from St Helen's Street, Ipswich. Halal, collection only.",
};

export default async function OrderPage() {
  const [boxes, settings] = await Promise.all([getMainMenu(), getOrderingSettings()]);

  return (
    <>
      {/* No reveal animation: its transform would pin the basket bar to this section. */}
      <Section reveal={false}>
        <div className="max-w-3xl">
          <Eyebrow>Order online</Eyebrow>
          <h1 className={`mt-6 ${h1}`}>Choose your box.</h1>
          <p className="mt-4 text-lg text-muted">
            Pick your box and your rice, pay securely online, then collect from St Helen&apos;s Street.
          </p>
          <ServiceNote className="mt-3 text-[15px] text-muted" />
        </div>

        <div className="mt-10">
          {boxes && boxes.length > 0 ? (
            <>
              <h2 className="sr-only">Boxes</h2>
              <OrderMenu boxes={boxes} settings={settings} />
            </>
          ) : (
            <div className="rounded-sm border border-hairline bg-paper px-6 py-8">
              <p className="font-display text-2xl font-semibold">Online ordering is coming soon</p>
              <p className="mt-2 text-muted">In the meantime, follow us on Instagram for news.</p>
              <InstagramLink className="mt-2" />
            </div>
          )}
        </div>
      </Section>

      <Section tone="paper">
        <h2 className={h2}>How it works</h2>
        <NumberedSteps steps={orderSteps} className="mt-12" />
        <p className="mt-16 border-t border-hairline pt-8 text-[15px] text-muted">
          Allergies? Check the allergens on each box before you order, and tell us in the note at checkout.
        </p>
      </Section>
    </>
  );
}
