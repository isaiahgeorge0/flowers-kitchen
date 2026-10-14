import { Section, SectionHeader } from "./Section";

/** Branded holding page until the real policy wording is supplied. See CONTENT_TODO.md. */
export function PolicyPlaceholder({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Section first reveal={false}>
      <SectionHeader level={1} eyebrow={eyebrow} title={title} />
      <div className="mt-10 max-w-measure rounded-card border border-dashed border-hairline bg-paper p-6 md:p-8">
        <p className="font-display text-[22px] font-semibold leading-snug">Policy to follow — XXXX</p>
        <p className="mt-2 text-muted">This page is a placeholder. The full wording will be added before launch.</p>
      </div>
    </Section>
  );
}
