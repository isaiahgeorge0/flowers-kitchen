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

  // Placeholder until the shoot: a light panel with a hibiscus outline and the caption.
  return (
    <div
      aria-hidden
      className={`${frame} flex flex-col items-center justify-center border border-hairline bg-paper`}
      style={{ aspectRatio: aspect }}
    >
      <span className="absolute inset-2.5 rounded-input border border-dashed border-hairline" />
      <span className="hibiscus-line relative aspect-square w-[22%] max-w-28 min-w-14" />
      <span className="relative mt-4 flex items-center gap-3 text-muted">
        <span className="h-px w-6 bg-allspice" />
        <span className={`${caps} tracking-[0.28em]`}>{caption}</span>
        <span className="h-px w-6 bg-allspice" />
      </span>
      <span className={`relative mt-2.5 ${caps} text-[11px] tracking-[0.28em] text-muted`}>Photo to follow</span>
    </div>
  );
}

