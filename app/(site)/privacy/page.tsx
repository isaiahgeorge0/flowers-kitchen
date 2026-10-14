import type { Metadata } from "next";
import { PolicyPlaceholder } from "@/components/PolicyPlaceholder";

export const metadata: Metadata = { title: "Privacy policy", robots: { index: false } };

export default function PrivacyPage() {
  return <PolicyPlaceholder eyebrow="Privacy" title="Privacy policy" />;
}
