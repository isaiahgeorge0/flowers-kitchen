import type { ReactNode } from "react";

export type EyebrowTone = "light" | "mountain" | "sorrel";

type EyebrowProps = {
  children: ReactNode;
  rules?: boolean;
  tone?: EyebrowTone;
  as?: "p" | "span" | "h2" | "h3";
  className?: string;
};

const colours: Record<EyebrowTone, string> = {
  light: "text-sorrel",
  mountain: "text-mountain-muted",
  sorrel: "text-cream",
};

export function Eyebrow({
  children,
  rules = false,
  tone = "light",
  as: Tag = "p",
  className = "",
}: EyebrowProps) {
  return (
    <Tag
      className={`flex items-center gap-4 text-[13px] font-semibold uppercase leading-none tracking-[0.32em] ${colours[tone]} ${className}`}
    >
      {rules && <span aria-hidden className="h-px w-8 bg-allspice" />}
      {/* Negative margin cancels the trailing letter-spacing so rules sit evenly. */}
      <span className="-mr-[0.32em]">{children}</span>
      {rules && <span aria-hidden className="h-px w-8 bg-allspice" />}
    </Tag>
  );
}
