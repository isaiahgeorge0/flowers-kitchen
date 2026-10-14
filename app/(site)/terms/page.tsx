import type { Metadata } from "next";
import { PolicyPlaceholder } from "@/components/PolicyPlaceholder";

export const metadata: Metadata = { title: "Terms", robots: { index: false } };

export default function TermsPage() {
  return <PolicyPlaceholder eyebrow="Terms" title="Terms and conditions" />;
}
