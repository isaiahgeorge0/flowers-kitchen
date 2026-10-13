export const navLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/catering", label: "Catering" },
  { href: "/our-story", label: "Our Story" },
  { href: "/find-us", label: "Find Us" },
] as const;

export const preOrderHref = "/menu";

export const instagram = {
  handle: "@flowerskitchenipswich",
  url: "https://www.instagram.com/flowerskitchenipswich/",
};

export const address = "St Helen's Street, Ipswich";

export const serviceNotes = ["Halal", "Collection only", "Pre-order"];

// TODO: Pre-order process to be confirmed with the client.
export const preOrderSteps = [
  "Choose your box",
  "Message us on Instagram with your order and collection time",
  "Collect from St Helen's Street",
];

export const openingHours = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((day) => ({ day, hours: "00:00 – 00:00" }));
