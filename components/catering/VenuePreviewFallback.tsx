import Image from "next/image";
import {
  guestsInRange,
  occasionLabel,
  serviceLabel,
  tablesFor,
  type CateringEvent,
} from "@/lib/catering";

// Shown while the 3D room loads, when WebGL isn't available, and if the scene errors.
// The wrapper in VenuePreview owns the role="img" and its description.
export function VenuePreviewFallback({ event }: { event: CateringEvent }) {
  const tables = guestsInRange(event.guests) ? tablesFor(event.guests) : null;
  const readouts = [
    { label: "Occasion", value: occasionLabel(event.occasion) },
    { label: "Tables", value: tables === null ? null : String(tables) },
    { label: "Service", value: serviceLabel(event.service) },
  ];

  return (
    <div className="flex h-full flex-col bg-mountain p-5 text-cream md:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-allspice">
        Your room
      </p>
      <div className="flex flex-1 items-center justify-center">
        <Image
          src="/brand/flowers-kitchen_mark_reverse-green.svg"
          alt=""
          width={376}
          height={376}
          className="h-auto w-16 md:w-20"
        />
      </div>
      <dl className="grid grid-cols-3 gap-3 border-t border-allspice pt-4">
        {readouts.map((readout) => (
          <div key={readout.label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mountain-muted">
              {readout.label}
            </dt>
            <dd className="mt-1 font-display text-base font-semibold leading-tight md:text-xl">
              {readout.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
