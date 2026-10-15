import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/order/CartDrawer";
import { basketAvailability, getMainMenu } from "@/lib/ordering/menu";
import { instagram } from "@/lib/site";
import { absoluteUrl } from "@/lib/site-url";

// TODO: Add openingHoursSpecification, telephone and priceRange once confirmed with the client.
const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Flowers Kitchen",
  url: absoluteUrl("/"),
  logo: absoluteUrl("/brand/flowers-kitchen_primary_full-colour.svg"),
  servesCuisine: "Jamaican",
  address: {
    "@type": "PostalAddress",
    streetAddress: "St Helen's Street",
    addressLocality: "Ipswich",
    addressCountry: "GB",
  },
  sameAs: [instagram.url],
};

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const boxes = await getMainMenu();
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
      <CartDrawer availability={boxes ? basketAvailability(boxes) : undefined} />
    </>
  );
}
