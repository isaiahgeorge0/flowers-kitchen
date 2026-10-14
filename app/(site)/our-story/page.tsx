// Copy to be reviewed with the family before launch.
import type { Metadata } from "next";
import { ButtonGroup, LinkButton } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { Section, SectionHeader } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { orderHref } from "@/lib/site";
import { display, h3 } from "@/lib/typography";

export const metadata: Metadata = { title: "Our Story" };

const chapters = [
  {
    eyebrow: "Jamaica",
    title: "Where it started",
    body: "Our fathers and uncles were born and raised in Jamaica. The recipes we cook today are the ones they grew up with.",
    caption: "Archive photo",
    alt: "The family in Jamaica",
  },
  {
    eyebrow: "Ipswich",
    title: "Building a life here",
    body: "They came to England, settled in Ipswich and built a life — and a kitchen — here.",
    caption: "Ipswich photo",
    alt: "The family in Ipswich",
  },
  {
    eyebrow: "Flowers & Sons",
    title: "The next generation",
    body: "Now the cooking is down to us — Asher and Tajay. Same recipes, same care, cooked fresh for Ipswich.",
    caption: "Asher & Tajay photo",
    alt: "Asher and Tajay Flowers",
  },
];

const values = [
  {
    title: "Family",
    body: "Recipes taught by our fathers and uncles. Cooked by their sons.",
  },
  {
    title: "Heritage",
    body: "Born in Jamaica, built in Ipswich. Proud of both.",
  },
  {
    title: "Quality",
    body: "Marinated overnight, cooked properly, never rushed.",
  },
];

export default function OurStoryPage() {
  return (
    <>
      <Section reveal={false} first>
        <Reveal>
          <Eyebrow>Our story</Eyebrow>
          <h1 className={`mt-3 max-w-4xl ${display}`}>
            Recipes passed down. Cooked by the next generation.
          </h1>
          <Photo
            alt="The Flowers family"
            aspect="16/9"
            caption="Family archive photo"
            sizes="(min-width: 1200px) 1136px, 100vw"
            className="mt-12 md:mt-16"
          />
        </Reveal>

        <div className="mt-20 flex flex-col gap-20 md:mt-32 md:gap-32">
          {chapters.map((chapter, i) => (
            <Reveal
              key={chapter.title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20"
            >
              <div className={i % 2 === 1 ? "lg:order-last" : ""}>
                <SectionHeader eyebrow={chapter.eyebrow} title={chapter.title} intro={chapter.body} />
              </div>
              <Photo
                alt={chapter.alt}
                aspect="4/3"
                caption={chapter.caption}
                sizes="(min-width: 1024px) 560px, 100vw"
              />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="mountain">
        <SectionHeader tone="mountain" eyebrow="What we stand for" title="Our values" />
        <ul className="mt-10 grid gap-12 md:grid-cols-3 md:gap-8">
          {values.map((value) => (
            <li key={value.title} className="border-t border-allspice/40 pt-6">
              <h3 className={h3}>{value.title}</h3>
              <p className="mt-3 max-w-xs text-mountain-muted">{value.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="paper" className="flex flex-col items-center text-center">
        <SectionHeader tone="paper" align="center" eyebrow="Order online" title="Taste it for yourself." />
        <ButtonGroup className="mt-10 w-full sm:w-auto sm:justify-center">
          <LinkButton href={orderHref} size="lg" arrow>
            Order online
          </LinkButton>
          <LinkButton href="/menu" variant="secondary" size="lg">
            See the menu
          </LinkButton>
        </ButtonGroup>
        <ServiceNote className="mt-8 text-muted" />
      </Section>
    </>
  );
}
