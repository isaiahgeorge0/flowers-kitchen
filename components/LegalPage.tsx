import type { ReactNode } from "react";
import { legal } from "@/lib/site";
import { h3 } from "@/lib/typography";
import { Section, SectionHeader } from "./Section";

/** Long-form page for policies: a ~720px text column with H2 sections. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <Section first reveal={false}>
      <SectionHeader level={1} eyebrow={eyebrow} title={title} intro={intro} />
      <p className="mt-4 text-[15px] text-muted">Last updated: {legal.lastUpdated}</p>
      <div className="mt-10 max-w-[45rem] border-t border-hairline">{children}</div>
    </Section>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-hairline py-10">
      <h2 className={h3}>{title}</h2>
      <div className="mt-4 flex flex-col gap-4 text-[17px] leading-[1.6] text-pretty md:text-lg [&_a]:font-semibold [&_a]:underline [&_a]:decoration-sorrel [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:marker:text-sorrel">
        {children}
      </div>
    </section>
  );
}

/** An obvious gap for the client to fill before launch (listed in CONTENT_TODO.md). */
export function PolicyGap({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-input border border-dashed border-hairline bg-paper px-4 py-3 text-[15px] text-muted">
      <span className="font-semibold text-pimento">To be confirmed: XXXX. </span>
      {children}
    </p>
  );
}
