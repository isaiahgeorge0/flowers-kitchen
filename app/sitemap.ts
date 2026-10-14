import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

// Public pages only: admin, checkout and order confirmations stay out (and are noindex).
const pages = ["/", "/menu", "/order", "/catering", "/our-story", "/find-us", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((path) => ({ url: absoluteUrl(path) }));
}
