import type { Metadata } from "next";
import { CheckoutForm, CheckoutHeading } from "@/components/order/CheckoutForm";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { basketAvailability, getMainMenu, getOrderingSettings } from "@/lib/ordering/menu";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [settings, boxes] = await Promise.all([getOrderingSettings(), getMainMenu()]);
  return (
    <Section reveal={false} first>
      <CheckoutHeading />
      <ServiceNote className="mt-5 text-muted" />
      <CheckoutForm settings={settings} availability={boxes ? basketAvailability(boxes) : undefined} />
    </Section>
  );
}
