import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/order/CartDrawer";
import { instagram } from "@/lib/site";

// TODO: Add openingHoursSpecification, telephone and priceRange once confirmed with the client.
const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Flowers Kitchen",
  servesCuisine: "Jamaican",
  address: {
    "@type": "PostalAddress",
    streetAddress: "St Helen's Street",
    addressLocality: "Ipswich",
    addressCountry: "GB",
  },
  sameAs: [instagram.url],
};

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(restaurantJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
