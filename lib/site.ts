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
/** For headings: only breaks after the comma. */
export const addressHeading = address.replace("St Helen's Street", "St\u00A0Helen's\u00A0Street");

// TODO: replace with the shop's real number — "01632 960000" is an Ofcom fictional number. See CONTENT_TODO.md.
export const phone = {
  display: "01632 960000",
  href: "tel:+441632960000",
};

/** Shown in customer emails once confirmed, e.g. "01473 000000". See CONTENT_TODO.md. */
export const shopPhone: string | null = null;

export const serviceNotes = ["Halal", "Collection only", "Order online"];

export const orderSteps = [
  "Choose your box",
  "Pay securely online",
  "Collect from St Helen's Street",
];
