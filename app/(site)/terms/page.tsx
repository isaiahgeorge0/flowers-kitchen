// Draft — to be reviewed by the client before launch.
// Placeholders (XXXX) are listed in CONTENT_TODO.md.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, PolicyGap } from "@/components/LegalPage";
import { legal, phone } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of sale",
  description:
    "The terms for ordering from Flowers Kitchen online: collection from St Helen's Street, Ipswich, allergens, prices, cancellations and refunds.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of sale"
      intro="The terms for ordering from us online. Please read them before you pay."
    >
      <LegalSection title="About us">
        <p>
          Flowers Kitchen is run by {legal.entityName}, {legal.postalAddress}. You can reach us on{" "}
          <a href={phone.href}>{phone.display}</a> or by email at {legal.email}.
        </p>
      </LegalSection>

      <LegalSection title="Your order">
        <p>
          When you pay, we email you an order confirmation with your order number. That&apos;s when our agreement
          with you begins.
        </p>
        <p>
          If we can&apos;t make your order, for example because we&apos;ve run out of something, we&apos;ll let you
          know and refund you in full to the card you paid with.
        </p>
      </LegalSection>

      <LegalSection title="Collection">
        <p>
          We&apos;re collection only. Please collect your order from us on St Helen&apos;s Street, Ipswich. We
          don&apos;t deliver.
        </p>
        <p>
          The collection time you choose, and any time we give you, is our best estimate. We cook to order, so at busy
          times your food may take a little longer. We&apos;ll email you when it&apos;s ready.
        </p>
      </LegalSection>

      <LegalSection title="Uncollected orders">
        <p>If you can&apos;t make it, please call us as soon as you can on <a href={phone.href}>{phone.display}</a>.</p>
        <PolicyGap>How long we keep an uncollected order, and whether it can be refunded.</PolicyGap>
      </LegalSection>

      <LegalSection title="Cancellations and refunds">
        <PolicyGap>
          Whether you can cancel once you&apos;ve paid, up to when, and how refunds work if something&apos;s wrong
          with your order.
        </PolicyGap>
        <p>
          If we cancel your order, we&apos;ll refund you in full to the card you paid with. Refunds usually take 5–10
          working days to reach your account. None of this affects your legal rights.
        </p>
      </LegalSection>

      <LegalSection title="Allergens">
        <p>
          The allergens for every box are shown on the menu and when you order. If you have an allergy, please tell us
          before you order, by calling <a href={phone.href}>{phone.display}</a>, and add it in the note at checkout.
        </p>
        <p>All our food is halal.</p>
      </LegalSection>

      <LegalSection title="Prices and payment">
        <p>
          Prices are in pounds sterling and include VAT where applicable. <span className="text-muted">(VAT status to be confirmed — XXXX.)</span>
        </p>
        <p>
          You pay in full when you order, by card, Apple Pay or Google Pay, through Stripe. We never see or store your
          card details. Our <Link href="/privacy">privacy policy</Link> explains how we use your details.
        </p>
      </LegalSection>

      <LegalSection title="The law">
        <p>These terms are governed by the law of England and Wales.</p>
      </LegalSection>
    </LegalPage>
  );
}
