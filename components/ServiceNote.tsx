import { serviceNotes } from "@/lib/site";
import { caps } from "@/lib/typography";
import { Dotted } from "./Dotted";

/** "Halal · Collection only · Order online" in tracked small caps. Colour comes from the parent unless set. */
export function ServiceNote({ className = "text-muted" }: { className?: string }) {
  return (
    <p className={`${caps} text-[12px] leading-[1.8] tracking-[0.14em] sm:text-[13px] sm:tracking-[0.2em] ${className}`}>
      <Dotted items={serviceNotes} />
    </p>
  );
}
