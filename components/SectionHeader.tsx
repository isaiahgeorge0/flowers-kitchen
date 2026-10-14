import type { ReactNode } from "react";
import { body, h1, h2 } from "@/lib/typography";
import { Eyebrow, type EyebrowTone } from "./Eyebrow";

// Kept apart from Section so pages that don't reveal (the 404) don't pull the Reveal client chunk into the layout.

export type SectionTone = "cream" | "paper" | "mountain" | "sorrel";

export const container = "mx-auto w-full max-w-content px-6 md:px-8";

/** Vertical rhythm between major sections, on the 8px grid. */
export const sectionY = "py-20 md:py-32";
/** The opening section of a page sits closer to the header. */
export const firstY = "pt-8 pb-20 md:pt-16 md:pb-32";

const eyebrowTone: Record<SectionTone, EyebrowTone> = {
  cream: "light",
  paper: "light",
  mountain: "mountain",
  sorrel: "sorrel",
};

const introTone: Record<SectionTone, string> = {
  cream: "text-muted",
  paper: "text-muted",
  mountain: "text-mountain-muted",
  sorrel: "text-cream",
};

type SectionHeaderProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  tone?: SectionTone;
  level?: 1 | 2;
  /** Swap in a larger class, e.g. the display size for a hero. */
  titleClassName?: string;
  align?: "start" | "center";
  id?: string;
  className?: string;
};

/** Eyebrow → heading → intro, with the spacing every section shares. Follow it with `mt-10` content. */
export function SectionHeader({
  eyebrow,
  title,
  intro,
  tone = "cream",
  level = 2,
  titleClassName,
  align = "start",
  id,
  className = "",
}: SectionHeaderProps) {
  const Heading = level === 1 ? "h1" : "h2";
  const centred = align === "center";
  return (
    <header className={`${centred ? "mx-auto text-center" : ""} max-w-3xl ${className}`}>
      <Eyebrow tone={eyebrowTone[tone]} className={centred ? "justify-center" : ""}>
        {eyebrow}
      </Eyebrow>
      <Heading id={id} className={`mt-3 ${titleClassName ?? (level === 1 ? h1 : h2)}`}>
        {title}
      </Heading>
      {intro && (
        <div className={`mt-4 ${body} ${introTone[tone]} ${centred ? "mx-auto" : ""}`}>{intro}</div>
      )}
    </header>
  );
}
