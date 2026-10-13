import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  weight: ["500", "600"],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const title = "Flowers Kitchen — Jamaican family recipes, Ipswich";

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s — Flowers Kitchen",
  },
  description:
    "Jamaican family recipes, cooked by the next generation. Halal boxes to collect from St Helen's Street, Ipswich. Order online or book us for your event.",
  icons: {
    icon: {
      url: "/brand/flowers-kitchen_mark_full-colour.svg",
      type: "image/svg+xml",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#F3EADB",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream font-sans text-pimento">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-paper focus:px-4 focus:py-3 focus:font-semibold"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
