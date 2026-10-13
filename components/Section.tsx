import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

const tones = {
  cream: "",
  paper: "bg-paper",
  mountain: "bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)]",
  sorrel: "bg-sorrel text-cream [--focus-ring:var(--color-cream)]",
};

export const container = "mx-auto w-full max-w-content px-6 md:px-8";

type SectionProps = {
  children: ReactNode;
  tone?: keyof typeof tones;
  reveal?: boolean;
  className?: string;
};

export function Section({
  children,
  tone = "cream",
  reveal = true,
  className = "",
}: SectionProps) {
  const inner = `${container} ${className}`;

  return (
    <section className={`py-16 md:py-24 ${tones[tone]}`}>
      {reveal ? (
        <Reveal className={inner}>{children}</Reveal>
      ) : (
        <div className={inner}>{children}</div>
      )}
    </section>
  );
}
