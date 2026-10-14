import type { Metadata } from "next";
import { CheckoutForm, CheckoutHeading } from "@/components/order/CheckoutForm";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { getOrderingSettings } from "@/lib/ordering/menu";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getOrderingSettings();
  return (
    <Section reveal={false} first>
      <CheckoutHeading />
      <ServiceNote className="mt-5 text-muted" />
      <CheckoutForm settings={settings} />
    </Section>
  );
}
