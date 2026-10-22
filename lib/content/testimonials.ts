export type Testimonial = {
  quote: string;
  name: string;
  place: string;
  /** Leave unset until there is a real photo. The slot then shows the hibiscus placeholder. */
  photo?: string;
};

/** Hide the sample block before launch if there is no real quote yet. */
export const SHOW_PLACEHOLDER_TESTIMONIAL = true;

const placeholder: Testimonial = {
  quote: "Customer quote to follow",
  name: "Customer name",
  place: "Ipswich",
};

export const testimonials: Testimonial[] = SHOW_PLACEHOLDER_TESTIMONIAL ? [placeholder] : [];
