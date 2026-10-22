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

export const phone = {
  display: "07471 904524",
  href: "tel:+447471904524",
};

// TODO: confirm with the client before launch. Used by /privacy and /terms. See CONTENT_TODO.md.
export const legal = {
  /** The business behind Flowers Kitchen, e.g. a limited company or partnership name. */
  entityName: "[Legal entity name: XXXX]",
  /** Full postal address including the number and postcode. */
  postalAddress: "XX St Helen's Street, Ipswich XXXX XXX",
  /** Where privacy and order questions go. */
  email: "[shop email: XXXX]",
  lastUpdated: "XXXX",
};

export const serviceNotes = ["Halal", "Collection only", "Order online"];

export const orderSteps = [
  "Choose your box",
  "Pay securely online",
  "Collect from St Helen's Street",
];
