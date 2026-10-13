// Copy to be reviewed with the family before launch.
import type { Metadata } from "next";
import { LinkButton } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { orderHref } from "@/lib/site";
import { display, h2, h3 } from "@/lib/typography";

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
      <Section reveal={false} className="flex flex-col gap-16 md:gap-24">
        <Reveal>
          <Eyebrow>Our story</Eyebrow>
          <h1 className={`mt-6 max-w-4xl ${display}`}>
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

        {chapters.map((chapter, i) => (
          <Reveal
            key={chapter.title}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
          >
            <div className={i % 2 === 1 ? "lg:order-last" : ""}>
              <Eyebrow>{chapter.eyebrow}</Eyebrow>
              <h2 className={`mt-6 ${h2}`}>{chapter.title}</h2>
              <p className="mt-6 max-w-lg text-lg">{chapter.body}</p>
            </div>
            <Photo
              alt={chapter.alt}
              aspect="4/3"
              caption={chapter.caption}
              sizes="(min-width: 1024px) 560px, 100vw"
            />
          </Reveal>
        ))}
      </Section>

      <Section tone="mountain">
        <h2 className="sr-only">Our values</h2>
        <ul className="grid gap-12 md:grid-cols-3 md:gap-8">
          {values.map((value) => (
            <li key={value.title}>
              <span aria-hidden className="block h-px w-10 bg-allspice" />
              <h3 className={`mt-6 ${h3}`}>{value.title}</h3>
              <p className="mt-3 max-w-xs text-mountain-muted">{value.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="flex flex-col items-center text-center">
        <h2 className={h2}>Taste it for yourself.</h2>
        <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <LinkButton href={orderHref}>Order online</LinkButton>
          <LinkButton href="/menu" variant="secondary">
            See the menu
          </LinkButton>
        </div>
        <ServiceNote className="mt-5 text-[15px] text-muted" />
      </Section>
    </>
  );
}
