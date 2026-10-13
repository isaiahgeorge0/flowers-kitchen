import Link from "next/link";
import { BoxCard } from "@/components/BoxCard";
import { LinkButton } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { InstagramLink } from "@/components/InstagramLink";
import { MapEmbed } from "@/components/MapEmbed";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { Photo } from "@/components/Photo";
import { Section } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { SidesSentence } from "@/components/SidesSentence";
import { FEATURED_BOXES } from "@/lib/menu";
import { boxPriceLabels } from "@/lib/ordering/menu";
import { address, orderHref } from "@/lib/site";
import { display, h2, textLink } from "@/lib/typography";

const facts = [
  { label: "Born in", value: "Jamaica" },
  { label: "Built in", value: "Ipswich" },
  { label: "Cooked by", value: "Flowers & Sons" },
];

export default function Home() {
  return (
    <>
      <Hero />
      <OurStory />
      <TheBoxes />
      <Catering />
      <FindUs />
    </>
  );
}

function Hero() {
  return (
    <Section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      <div>
        <Eyebrow>Flowers &amp; Sons</Eyebrow>
        <h1 className={`mt-6 ${display}`}>
          Jamaican family recipes, cooked by the next generation.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Taught by our fathers and uncles. Cooked fresh in Ipswich.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <LinkButton href={orderHref}>Order online</LinkButton>
          <LinkButton href="/catering" variant="secondary">
            Plan an event
          </LinkButton>
        </div>
        <ServiceNote className="mt-5 text-[15px] text-muted" />
      </div>

      <Photo
        alt="Flowers Kitchen boxes"
        aspect="4/5"
        caption="Hero photo"
        sizes="(min-width: 1024px) 520px, 100vw"
      />
    </Section>
  );
}

function OurStory() {
  return (
    <Section tone="mountain">
      <div className="max-w-3xl">
        <Eyebrow as="h2" tone="mountain">
          Our story
        </Eyebrow>
        <blockquote className="mt-8 font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em] md:text-[52px] md:leading-[1.05]">
          <p>Recipes passed down. Cooked by the next generation.</p>
        </blockquote>
        <p className="mt-8 max-w-2xl text-lg text-mountain-muted">
          Our fathers and uncles were born and raised in Jamaica, came to
          Ipswich and built a life here. Everything we cook, they taught us.
        </p>
        <Link
          href="/our-story"
          className={`mt-8 ${textLink} decoration-allspice`}
        >
          Read our story&nbsp;<span aria-hidden>→</span>
        </Link>
      </div>

      <dl className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8 md:mt-24">
        {facts.map((fact) => (
          <div key={fact.label}>
            <span aria-hidden className="block h-px w-10 bg-allspice" />
            <dt className="mt-5 text-[15px] text-mountain-muted">
              {fact.label}
            </dt>
            <dd className="mt-1 font-display text-[28px] font-semibold leading-tight">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

async function TheBoxes() {
  const prices = await boxPriceLabels();
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>The boxes</Eyebrow>
        <h2 className={`mt-6 ${h2}`}>Pick your box.</h2>
        <SidesSentence className="mt-4 text-lg text-muted" />
      </div>

      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {FEATURED_BOXES.map((box) => (
          <li key={box.slug}>
            <BoxCard box={box} price={prices[box.slug]} />
          </li>
        ))}
      </ul>

      <div className="mt-12 flex justify-center">
        <LinkButton href="/menu" variant="secondary">
          See the full menu
        </LinkButton>
      </div>
    </Section>
  );
}

function Catering() {
  return (
    <Section
      tone="sorrel"
      className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
    >
      <div>
        <Eyebrow tone="sorrel">Catering</Eyebrow>
        <h2 className={`mt-6 ${h2}`}>
          Feeding your family, the way we feed ours.
        </h2>
        <p className="mt-6 max-w-xl text-lg">
          Birthdays, weddings, office lunches, christenings. Tell us about your
          event and we&apos;ll put together the food.
        </p>
        <LinkButton href="/catering" variant="inverse" className="mt-10">
          Plan your event
        </LinkButton>
      </div>

      <div className="hidden lg:block">
        <Photo
          alt="Flowers Kitchen catering"
          aspect="4/3"
          caption="Event photo"
          sizes="560px"
        />
      </div>
    </Section>
  );
}

function FindUs() {
  return (
    <Section tone="paper" className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      <div>
        <Eyebrow>Find us</Eyebrow>
        <h2 className={`mt-6 ${h2}`}>{address}</h2>

        <OpeningHoursTable className="mt-10 max-w-sm text-[15px]" />

        <p className="mt-8">
          Collection only.{" "}
          <Link href={orderHref} className="font-semibold underline decoration-sorrel underline-offset-4">
            Order online
          </Link>{" "}
          and collect from us.
        </p>
        <InstagramLink />
        <ServiceNote className="mt-4 text-[15px] text-muted" />
      </div>

      <MapEmbed className="aspect-4/3 lg:aspect-auto lg:h-full lg:min-h-[28rem]" />
    </Section>
  );
}
