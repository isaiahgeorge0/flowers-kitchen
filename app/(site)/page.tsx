import { Phone } from "lucide-react";
import Link from "next/link";
import { BoxCard } from "@/components/BoxCard";
import { ButtonGroup, LinkButton } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import { InstagramLink } from "@/components/InstagramLink";
import { MapCard } from "@/components/MapCard";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { Photo } from "@/components/Photo";
import { Section, SectionHeader } from "@/components/Section";
import { ServiceNote } from "@/components/ServiceNote";
import { SidesSentence } from "@/components/SidesSentence";
import { FEATURED_BOXES } from "@/lib/menu";
import { boxPriceLabels } from "@/lib/ordering/menu";
import { addressHeading, orderHref, phone } from "@/lib/site";
import { body, textLink } from "@/lib/typography";

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
    <Section first className="grid items-center gap-14 lg:grid-cols-[1.3fr_0.7fr] lg:gap-16 xl:gap-20">
      <div>
        <Eyebrow>Flowers &amp; Sons</Eyebrow>
        <h1 className="mt-4 font-display text-[42px] font-semibold leading-[1] tracking-[-0.02em] min-[375px]:text-[44px] sm:text-[64px] lg:text-[76px] xl:text-[88px] xl:leading-[0.95]">
          Jamaican family <br />
          recipes, cooked <br />
          by the next <br />
          generation.
        </h1>
        <p className={`mt-6 ${body} text-muted md:text-[20px]`}>
          Taught by our fathers and uncles. Cooked fresh in Ipswich.
        </p>
        <ButtonGroup className="mt-10">
          <LinkButton href={orderHref} size="lg" arrow>
            Order online
          </LinkButton>
          <LinkButton href="/catering" variant="secondary" size="lg">
            Plan an event
          </LinkButton>
        </ButtonGroup>
        <ServiceNote className="mt-8 text-muted" />
      </div>

      <div className="relative mr-3 mb-3 sm:mr-5 sm:mb-5 lg:mr-6 lg:mb-6">
        <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-media bg-sorrel sm:translate-x-5 sm:translate-y-5 lg:translate-x-6 lg:translate-y-6" />
        <Photo
          alt="Flowers Kitchen boxes"
          aspect="4/5"
          caption="Hero photo"
          sizes="(min-width: 1024px) 420px, 100vw"
          className="relative"
        />
      </div>
    </Section>
  );
}

function OurStory() {
  return (
    <Section tone="mountain" className="grid gap-14 lg:grid-cols-[1.4fr_0.6fr] lg:items-end lg:gap-20">
      <div>
        <SectionHeader
          tone="mountain"
          eyebrow="Our story"
          title="Recipes passed down. Cooked by the next generation."
          titleClassName="font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.015em] text-balance md:text-[52px]"
          intro="Our fathers and uncles were born and raised in Jamaica, came to Ipswich and built a life here. Everything we cook, they taught us."
          className="max-w-none"
        />
        <LinkButton href="/our-story" variant="on-dark" arrow className="mt-10">
          Read our story
        </LinkButton>
      </div>

      <dl className="grid gap-8 sm:grid-cols-3 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-allspice/40 lg:border-y lg:border-allspice/40">
        {facts.map((fact) => (
          <div key={fact.label} className="lg:py-6">
            <span aria-hidden className="block h-px w-10 bg-allspice lg:hidden" />
            <dt className="mt-5 text-[15px] text-mountain-muted lg:mt-0">{fact.label}</dt>
            <dd className="mt-1 font-display text-[28px] font-semibold leading-tight">{fact.value}</dd>
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
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <SectionHeader eyebrow="The boxes" title="Pick your box." intro={<SidesSentence />} />
        <LinkButton href="/menu" variant="secondary" arrow className="hidden self-start md:inline-flex md:self-auto">
          See the full menu
        </LinkButton>
      </div>

      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {FEATURED_BOXES.map((box) => (
          <li key={box.slug}>
            <BoxCard box={box} price={prices[box.slug]} />
          </li>
        ))}
      </ul>

      <LinkButton href="/menu" variant="secondary" arrow className="mt-10 w-full md:hidden">
        See the full menu
      </LinkButton>
    </Section>
  );
}

function Catering() {
  return (
    <Section tone="sorrel" className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
      <div>
        <SectionHeader
          tone="sorrel"
          eyebrow="Catering"
          title="Feeding your family, the way we feed ours."
          intro="Birthdays, weddings, office lunches, christenings. Tell us about your event and we'll put together the food."
        />
        <LinkButton href="/catering" variant="on-dark" size="lg" arrow className="mt-10">
          Plan your event
        </LinkButton>
      </div>

      <div className="hidden lg:block">
        <Photo alt="Flowers Kitchen catering" aspect="4/3" caption="Event photo" sizes="560px" />
      </div>
    </Section>
  );
}

function FindUs() {
  return (
    <Section tone="paper" className="grid gap-14 lg:grid-cols-2 lg:gap-20">
      <div>
        <SectionHeader tone="paper" eyebrow="Find us" title={addressHeading} />

        <OpeningHoursTable className="mt-10 max-w-sm text-[15px]" />

        <p className="mt-8 max-w-measure">
          Collection only.{" "}
          <Link href={orderHref} className="font-semibold underline decoration-sorrel underline-offset-4">
            Order online
          </Link>{" "}
          and collect from us.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-8">
          <a href={phone.href} className={`${textLink} gap-2.5 decoration-sorrel tabular-nums`}>
            <Phone aria-hidden strokeWidth={1.5} className="size-[18px] text-sorrel" />
            <span>
              <span className="sr-only">Call us on </span>
              {phone.display}
            </span>
          </a>
          <InstagramLink />
        </div>
        <ServiceNote className="mt-6 text-muted" />
      </div>

      <MapCard className="aspect-square sm:aspect-4/3 lg:aspect-auto lg:h-full lg:min-h-[28rem]" />
    </Section>
  );
}
