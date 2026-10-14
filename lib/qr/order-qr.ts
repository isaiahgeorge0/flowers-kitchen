import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { absoluteUrl, displayUrl } from "@/lib/site-url";
import { CAP_HEIGHT, textToPath } from "./lettering";

// The counter QR code: links to /order?src=qr so QR orders are counted separately.
// Error correction "H" (about 30% recoverable) leaves room for the hibiscus mark in the middle;
// the mark covers about 5% of the code.

const COLOURS = { cream: "#F3EADB", pimento: "#2B1B16", sorrel: "#8F1D2C", allspice: "#B9853F" };

const MARK_FILE = path.join(process.cwd(), "public", "brand", "flowers-kitchen_mark_full-colour.svg");

export function qrOrderUrl() {
  return absoluteUrl("/order?src=qr");
}

/** Printed under the code, e.g. "flowerskitchen.co.uk/order". */
export function qrDisplayUrl() {
  return displayUrl("/order");
}

let markCache: { viewBox: string; inner: string } | null = null;

/** The official mark, unchanged, ready to nest inside another SVG. */
async function brandMark() {
  if (markCache) return markCache;
  const source = await readFile(MARK_FILE, "utf8");
  const open = source.match(/<svg\b[^>]*>/);
  const viewBox = open?.[0].match(/viewBox="([^"]+)"/)?.[1];
  if (!open || !viewBox) throw new Error("Brand mark SVG is not readable");
  const inner = source
    .slice((open.index ?? 0) + open[0].length, source.lastIndexOf("</svg>"))
    .replace(/<title>[\s\S]*?<\/title>/, "");
  markCache = { viewBox, inner };
  return markCache;
}

/** Dark modules as one path in module units, merging runs along each row. */
function modulesPath(size: number, isDark: (row: number, col: number) => boolean) {
  const parts: string[] = [];
  for (let row = 0; row < size; row += 1) {
    let col = 0;
    while (col < size) {
      if (!isDark(row, col)) {
        col += 1;
        continue;
      }
      const start = col;
      while (col < size && isDark(row, col)) col += 1;
      parts.push(`M${start} ${row}h${col - start}v1h-${col - start}z`);
    }
  }
  return parts.join("");
}

/** The code with the mark in the middle, as an SVG group of `width` units, quiet zone included. */
async function codeGroup(url: string, x: number, y: number, width: number) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const quiet = 4;
  const total = size + quiet * 2;
  const unit = width / total;
  const d = modulesPath(size, (row, col) => qr.modules.get(row, col) === 1);
  const mark = await brandMark();

  const centre = width / 2;
  const padRadius = size * unit * 0.13;
  const markSize = padRadius * 1.7;

  return `<g transform="translate(${x} ${y})">
    <rect width="${width}" height="${width}" fill="${COLOURS.cream}"/>
    <path transform="translate(${quiet * unit} ${quiet * unit}) scale(${unit})" fill="${COLOURS.pimento}" shape-rendering="crispEdges" d="${d}"/>
    <circle cx="${centre}" cy="${centre}" r="${padRadius}" fill="${COLOURS.cream}"/>
    <svg x="${centre - markSize / 2}" y="${centre - markSize / 2}" width="${markSize}" height="${markSize}" viewBox="${mark.viewBox}" role="img" aria-label="Flowers Kitchen">${mark.inner}</svg>
  </g>`;
}

/**
 * Print-ready artwork: "— SCAN TO ORDER —" in tracked capitals, the code, and the web address.
 * All lettering is outlined, so it prints the same anywhere.
 */
export async function orderQrSvg() {
  const width = 1000;
  const codeTop = 210;
  const codeWidth = 840;
  const height = codeTop + codeWidth + 170;

  const eyebrow = textToPath("SCAN TO ORDER", { size: 40, tracking: 0.32 });
  const eyebrowX = (width - eyebrow.width) / 2;
  const eyebrowBaseline = 150;
  const ruleY = eyebrowBaseline - (40 * CAP_HEIGHT) / 2;
  const ruleGap = 28;
  const ruleLength = 72;

  const address = textToPath(qrDisplayUrl(), { size: 44 });
  const addressX = (width - address.width) / 2;
  const addressBaseline = codeTop + codeWidth + 100;

  const code = await codeGroup(qrOrderUrl(), (width - codeWidth) / 2, codeTop, codeWidth);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="fk-qr-title">
  <title id="fk-qr-title">Flowers Kitchen: scan to order</title>
  <rect width="${width}" height="${height}" fill="${COLOURS.cream}"/>
  <g stroke="${COLOURS.allspice}" stroke-width="3">
    <line x1="${eyebrowX - ruleGap - ruleLength}" y1="${ruleY}" x2="${eyebrowX - ruleGap}" y2="${ruleY}"/>
    <line x1="${eyebrowX + eyebrow.width + ruleGap}" y1="${ruleY}" x2="${eyebrowX + eyebrow.width + ruleGap + ruleLength}" y2="${ruleY}"/>
  </g>
  <path transform="translate(${eyebrowX} ${eyebrowBaseline})" fill="${COLOURS.sorrel}" d="${eyebrow.d}"/>
  ${code}
  <path transform="translate(${addressX} ${addressBaseline})" fill="${COLOURS.pimento}" d="${address.d}"/>
</svg>`;
}

/** Just the code and mark, square, for the counter card and the settings preview. */
export async function orderQrCodeSvg() {
  const width = 1000;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${width}" role="img" aria-label="QR code: scan to order from Flowers Kitchen">${await codeGroup(qrOrderUrl(), 0, 0, width)}</svg>`;
}

/** High-resolution PNG of the print artwork. */
export async function orderQrPng(width = 3000) {
  const svg = await orderQrSvg();
  return sharp(Buffer.from(svg), { density: 300 }).resize({ width }).flatten({ background: COLOURS.cream }).png().toBuffer();
}
