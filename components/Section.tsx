import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { container, firstY, sectionY, type SectionTone } from "./SectionHeader";

export { container, sectionY, SectionHeader } from "./SectionHeader";

const tones: Record<SectionTone, string> = {
  cream: "",
  paper: "bg-paper",
  mountain: "bg-mountain text-cream [--focus-ring:var(--color-mountain-focus)]",
  sorrel: "bg-sorrel text-cream [--focus-ring:var(--color-cream)]",
};

type SectionProps = {
  children: ReactNode;
  tone?: SectionTone;
  reveal?: boolean;
  /** Opening section of the page: less space above, under the header. */
  first?: boolean;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
};

export function Section({
  children,
  tone = "cream",
  reveal = true,
  first = false,
  className = "",
  ...rest
}: SectionProps) {
  const inner = `${container} ${className}`;

  return (
    <section className={`${first ? firstY : sectionY} ${tones[tone]}`} {...rest}>
      {reveal ? (
        <Reveal className={inner}>{children}</Reveal>
      ) : (
        <div className={inner}>{children}</div>
      )}
    </section>
  );
}
