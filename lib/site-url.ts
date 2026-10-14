// The public origin (NEXT_PUBLIC_SITE_URL) for every absolute link: metadata, sitemap, robots,
// JSON-LD and the QR code. Never hard-code the domain; set the variable per environment.

export function siteOrigin() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return site ? new URL(site).origin : "http://localhost:3000";
}

export function absoluteUrl(path = "/") {
  return new URL(path, siteOrigin()).toString();
}

/** The address as people type it, e.g. "flowerskitchen.co.uk/order". */
export function displayUrl(path = "") {
  return `${new URL(siteOrigin()).host.replace(/^www\./, "")}${path}`;
}
