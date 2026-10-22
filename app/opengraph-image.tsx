import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

// Satori reads ttf/otf/woff only (not woff2), so the brand fonts are kept as woff in assets/fonts.

export const alt = "Flowers Kitchen | Jamaican family recipes, cooked in Ipswich.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Synchronous reads keep the image prerendered at build time; literal paths keep file tracing narrow.
export default function OpengraphImage() {
  const logo = readFileSync(path.join(process.cwd(), "public/brand/flowers-kitchen_primary_full-colour.svg"));
  const fraunces = readFileSync(path.join(process.cwd(), "assets/fonts/fraunces-latin-600-normal.woff"));
  const dmSans = readFileSync(path.join(process.cwd(), "assets/fonts/dm-sans-latin-600-normal.woff"));
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "0 96px",
          background: "#F3EADB",
          color: "#2B1B16",
        }}
      >
        <img src={logoSrc} alt="Flowers Kitchen" width={436} height={381} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              fontFamily: "DM Sans",
              fontSize: 22,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "#8F1D2C",
            }}
          >
            <div style={{ width: 40, height: 2, background: "#B9853F" }} />
            <span style={{ marginRight: "-0.32em" }}>Flowers &amp; Sons</span>
            <div style={{ width: 40, height: 2, background: "#B9853F" }} />
          </div>
          <div
            style={{
              marginTop: 24,
              fontFamily: "Fraunces",
              fontSize: 64,
              lineHeight: 1.02,
              letterSpacing: "-0.015em",
            }}
          >
            Jamaican family recipes, cooked in Ipswich.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "DM Sans", data: dmSans, weight: 600, style: "normal" },
      ],
    },
  );
}
