import { ButtonGroup, LinkButton } from "./Button";
import { container, firstY, SectionHeader } from "./SectionHeader";
import { ServiceNote } from "./ServiceNote";
import { orderHref } from "@/lib/site";

export function NotFoundContent() {
  return (
    <section className={firstY}>
      <div className={`${container} flex min-h-[50vh] flex-col justify-center`}>
        <SectionHeader
          level={1}
          eyebrow="Page not found"
          title="We couldn't find that page."
          intro="The link may be old or mistyped. Try the menu, or head back to the start."
        />
        <ButtonGroup className="mt-10">
          <LinkButton href={orderHref} size="lg" arrow>
            Order online
          </LinkButton>
          <LinkButton href="/" variant="secondary" size="lg">
            Back to home
          </LinkButton>
        </ButtonGroup>
        <ServiceNote className="mt-8 text-muted" />
      </div>
    </section>
  );
}
