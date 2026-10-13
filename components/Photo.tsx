import Image from "next/image";

type PhotoProps = {
  src?: string;
  alt: string;
  aspect: `${number}/${number}`;
  caption?: string;
  sizes?: string;
  className?: string;
};

export function Photo({
  src,
  alt,
  aspect,
  caption = "Food photo",
  sizes = "100vw",
  className = "",
}: PhotoProps) {
  const frame = `relative overflow-hidden rounded-md ${className}`;

  if (src) {
    return (
      <div className={frame} style={{ aspectRatio: aspect }}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={`${frame} flex items-center justify-center bg-linear-to-br from-pimento to-[#4A3328]`}
      style={{ aspectRatio: aspect }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-mountain-muted">
        {caption}
      </span>
    </div>
  );
}
