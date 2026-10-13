export type Box = {
  slug: string;
  name: string;
  price: string;
  note?: string;
  featured: boolean;
  image?: string;
};

export const BOXES: Box[] = [
  { slug: "jerk-chicken", name: "Jerk Chicken", price: "£XX", featured: true },
  { slug: "fried-chicken", name: "Fried Chicken", price: "£XX", featured: true },
  { slug: "bbq-chicken", name: "BBQ Chicken", price: "£XX", featured: true },
  { slug: "curry-goat", name: "Curry Goat", price: "£XX", featured: false },
  { slug: "curry-chicken", name: "Curry Chicken", price: "£XX", featured: false },
  { slug: "fried-fish", name: "Fried Fish", price: "£XX", featured: false },
  { slug: "wings", name: "Wings", price: "£XX", featured: false },
];

export const FEATURED_BOXES = BOXES.filter((box) => box.featured);

export const SIDES =
  "Rice & peas or white rice · mac & cheese · festival · coleslaw";
