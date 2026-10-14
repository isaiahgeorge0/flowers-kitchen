import { ArrowUpRight } from "lucide-react";
import { buttonClasses } from "./Button";

const mapsUrl = "https://www.google.com/maps/search/?api=1&query=St+Helen%27s+Street+Ipswich";

// A drawn street map rather than an embedded one, so the page sets no third-party cookies.
// Illustrative only: St Helen's Street runs through the centre, where the pin sits. The drawing and
// pin are one static file so they stay out of the page HTML; object-cover keeps the pin centred.

export function MapCard({ className = "" }: { className?: string }) {
  return (
    <div data-map-card className={`relative overflow-hidden rounded-media border border-hairline bg-cream ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG; next/image can't optimise it */}
      <img
        src="/illustrations/st-helens-street-map.svg"
        alt=""
        width={800}
        height={600}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <p className="absolute top-1/2 left-1/2 mt-4 -translate-x-1/2 rounded-pill border border-hairline bg-paper px-4 py-2 text-[15px] font-semibold whitespace-nowrap shadow-soft">
        St Helen&apos;s Street, Ipswich
      </p>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses("secondary", "md", "absolute bottom-4 left-4 bg-paper shadow-soft sm:bottom-6 sm:left-6")}
      >
        Open in Google Maps
        <span className="sr-only"> (opens in a new tab)</span>
        <ArrowUpRight aria-hidden strokeWidth={1.5} className="-mr-1 size-[18px]" />
      </a>
    </div>
  );
}
