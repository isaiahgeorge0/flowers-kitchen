import Image from "next/image";
import { caps } from "@/lib/typography";

type PhotoProps = {
  src?: string;
  alt: string;
  aspect: `${number}/${number}`;
  caption?: string;
  sizes?: string;
  /** Inside a padded card: a tighter radius so the corners sit concentric with the card. */
  inset?: boolean;
  className?: string;
};

export function Photo({
  src,
  alt,
  aspect,
  caption = "Food photo",
  sizes = "100vw",
  inset = false,
  className = "",
}: PhotoProps) {
  const frame = `relative overflow-hidden ${inset ? "rounded-input" : "rounded-media"} ${className}`;

  if (src) {
    return (
      <div className={frame} style={{ aspectRatio: aspect }}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

  // Placeholder until the shoot: a warm dark panel with a faint hibiscus and the caption.
  return (
    <div
      aria-hidden
      className={`${frame} flex flex-col items-center justify-center bg-pimento`}
      style={{ aspectRatio: aspect }}
    >
      <span className="hibiscus-watermark pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[58%] max-w-80 -translate-1/2 text-cream opacity-[0.06]" />
      <span className="absolute inset-2.5 rounded-input border border-dashed border-mountain-muted/25" />
      <span className="relative flex items-center gap-3 text-mountain-muted">
        <span className="h-px w-6 bg-allspice/70" />
        <span className={`${caps} tracking-[0.28em]`}>{caption}</span>
        <span className="h-px w-6 bg-allspice/70" />
      </span>
      <span className={`relative mt-2.5 ${caps} text-[11px] tracking-[0.28em] text-mountain-muted`}>
        Photo to follow
      </span>
    </div>
  );
}
