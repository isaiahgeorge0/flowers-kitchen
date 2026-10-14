import { address } from "@/lib/site";

const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

export function MapEmbed({ className = "" }: { className?: string }) {
  return (
    <iframe
      src={src}
      title={`Map of ${address}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`w-full rounded-media border border-hairline ${className}`}
    />
  );
}
