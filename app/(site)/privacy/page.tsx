// Draft — to be reviewed by the client before launch.
// Placeholders (XXXX, XX) are listed in CONTENT_TODO.md.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { legal } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Flowers Kitchen uses the details you give us when you order online or ask about catering, who helps us, and your rights.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      intro="What we collect when you order from us or ask about catering, why we need it, and what you can ask us to do with it."
    >
      <LegalSection title="Who we are">
        <p>
          Flowers Kitchen is a Jamaican takeaway on St Helen&apos;s Street, Ipswich, run by brothers Asher and Tajay
          Flowers. In this policy, &ldquo;we&rdquo; means {legal.entityName}, which is responsible for your personal
          information.
        </p>
        <p>
          You can contact us about anything in this policy by email at {legal.email}, or by post at{" "}
          {legal.postalAddress}.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>When you send a catering enquiry, we collect:</p>
        <ul>
          <li>your name, email address and phone number</li>
          <li>
            your event details: the occasion, date and time, number of guests, the food and service you&apos;d like,
            and the venue postcode
          </li>
          <li>any notes you add.</li>
        </ul>
        <p>When you order online, we collect:</p>
        <ul>
          <li>your name, phone number and email address</li>
          <li>what you ordered, and any note you add for the kitchen</li>
          <li>the collection time you choose.</li>
        </ul>
        <p>
          If you tell us about an allergy in a note, we use it only to prepare your food safely. Please share only what
          we need for that.
        </p>
        <p>
          We never see or store your card details. You pay on Stripe&apos;s own secure page, and Stripe tells us
          whether the payment went through.
        </p>
      </LegalSection>

      <LegalSection title="Why we use it">
        <ul>
          <li>
            <strong>To reply to your catering enquiry</strong> and put together a quote. The law calls this taking steps
            at your request before entering into a contract.
          </li>
          <li>
            <strong>To prepare your order and contact you about it</strong>, for example when it&apos;s ready or if we
            have to cancel it. This is needed to perform our contract with you.
          </li>
          <li>
            <strong>To keep records of orders and payments</strong> for our accounts, as the law requires.
          </li>
        </ul>
        <p>We don&apos;t sell your details, and we don&apos;t use them for marketing.</p>
        <p>
          To see which pages are useful, we count visits to this website using Vercel Web Analytics. It doesn&apos;t
          use cookies and doesn&apos;t identify you.
        </p>
      </LegalSection>

      <LegalSection title="Who processes it for us">
        <p>A few trusted companies help us run the website and the business. They only use your details to do this work for us.</p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts this website.
          </li>
          <li>
            <strong>Supabase</strong> stores enquiries and orders securely.
          </li>
          <li>
            <strong>Resend</strong> sends our emails.
          </li>
          <li>
            <strong>Stripe</strong> takes payments. Your card details go straight to Stripe and are never stored by us.
            Stripe Checkout runs on Stripe&apos;s own website, and Stripe&apos;s privacy policy covers the details you
            enter there.
          </li>
        </ul>
        <p>
          Some of these companies may process data outside the UK. Where they do, they use safeguards recognised under
          UK data protection law.
        </p>
      </LegalSection>

      <LegalSection title="Emails we send">
        <p>We only email you about your order or your enquiry:</p>
        <ul>
          <li>an order confirmation when you pay</li>
          <li>a message when your order is ready to collect</li>
          <li>if we have to cancel your order, an email telling you, with details of your refund</li>
          <li>a confirmation when you send a catering enquiry, and our replies to it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <ul>
          {/* TODO: confirm retention periods with the client (CONTENT_TODO.md). */}
          <li>Catering enquiries: XX months after we last hear from you, then deleted.</li>
          <li>Orders: X years, for our accounts.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>Under UK data protection law (the UK GDPR), you can ask us to:</p>
        <ul>
          <li>give you a copy of the personal information we hold about you</li>
          <li>correct anything that&apos;s wrong</li>
          <li>delete your information, where we don&apos;t need to keep it</li>
          <li>stop using your information, if you object to how we use it.</li>
        </ul>
        <p>
          To ask, email us at {legal.email} or write to {legal.postalAddress}. We&apos;ll reply within one month.
        </p>
        <p>
          If you&apos;re unhappy with how we&apos;ve handled your information, please tell us first so we can put it
          right. You also have the right to complain to the Information Commissioner&apos;s Office (ICO) at{" "}
          <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
            ico.org.uk
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We don&apos;t use tracking or advertising cookies, and our visit counts don&apos;t use cookies either.
        </p>
        <p>
          Your browser keeps a few small items for the site to work: your basket while you order, your catering
          enquiry while you fill it in, and, if you scanned our counter QR code, a note of that for a few hours. They
          stay on your device and aren&apos;t used to track you.
        </p>
        <p>
          When you pay, Stripe&apos;s checkout page may set its own cookies, for example to prevent fraud. Our{" "}
          <Link href="/terms">terms of sale</Link> explain how ordering works.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>If we change how we use your information, we&apos;ll update this page and the date at the top.</p>
      </LegalSection>
    </LegalPage>
  );
}
