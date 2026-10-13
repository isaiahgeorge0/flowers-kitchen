import type { ReactNode } from "react";

type EyebrowProps = {
  children: ReactNode;
  rules?: boolean;
  tone?: "light" | "mountain" | "sorrel";
  as?: "p" | "span" | "h2" | "h3";
  className?: string;
};

export function Eyebrow({
  children,
  rules = false,
  tone = "light",
  as: Tag = "p",
  className = "",
}: EyebrowProps) {
  const colour = {
    light: "text-sorrel",
    mountain: "text-allspice",
    sorrel: "text-cream",
  }[tone];

  return (
    <Tag
      className={`flex items-center gap-4 text-[13px] font-semibold uppercase leading-none tracking-[0.32em] ${colour} ${className}`}
    >
      {rules && <span aria-hidden className="h-px w-8 bg-allspice" />}
      {/* Negative margin cancels the trailing letter-spacing so rules sit evenly. */}
      <span className="-mr-[0.32em]">{children}</span>
      {rules && <span aria-hidden className="h-px w-8 bg-allspice" />}
    </Tag>
  );
}
