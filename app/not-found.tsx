import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotFoundContent } from "@/components/NotFoundContent";

export const metadata: Metadata = { title: "Page not found" };

// Unmatched URLs only get the root layout, so this brings the site chrome with it.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="flex flex-1 flex-col">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
