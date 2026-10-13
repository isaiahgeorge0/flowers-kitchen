export const navLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/catering", label: "Catering" },
  { href: "/our-story", label: "Our Story" },
  { href: "/find-us", label: "Find Us" },
] as const;

export const orderHref = "/order";

export const instagram = {
  handle: "@flowerskitchenipswich",
  url: "https://www.instagram.com/flowerskitchenipswich/",
};

export const address = "St Helen's Street, Ipswich";

/** Shown in customer emails once confirmed, e.g. "01473 000000". See CONTENT_TODO.md. */
export const shopPhone: string | null = null;

export const serviceNotes = ["Halal", "Collection only", "Pre-order"];

export const orderSteps = [
  "Choose your box",
  "Pay securely online",
  "Collect from St Helen's Street",
];
