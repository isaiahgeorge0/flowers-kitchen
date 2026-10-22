import { Photo } from "@/components/Photo";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { testimonials } from "@/lib/content/testimonials";
import { h2 } from "@/lib/typography";

export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <Section tone="paper">
      <Eyebrow>Testimonial</Eyebrow>
      <ul className="mt-10 flex flex-col gap-16 md:gap-20">
        {testimonials.map((item) => (
          <li key={`${item.name}-${item.place}`}>
            <figure className="grid items-center gap-8 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-12 lg:grid-cols-[14rem_minmax(0,40rem)] lg:gap-16">
              <Photo
                src={item.photo}
                alt={item.photo ? `${item.name}, ${item.place}` : ""}
                aspect="3/4"
                caption="Customer photo"
                sizes="(min-width: 1024px) 224px, 176px"
                shape="pill"
                className="mx-auto w-40 sm:mx-0 sm:w-full"
              />
              <div>
                <blockquote className={h2}>
                  <p>{item.quote}</p>
                </blockquote>
                <figcaption className="mt-6 text-[15px] leading-[1.55] text-muted">
                  {item.name}
                  {"\u00a0· "}
                  {item.place}
                </figcaption>
              </div>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
