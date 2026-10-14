import type { ComponentProps } from "react";

type BrandLogoProps = Omit<ComponentProps<"img">, "alt" | "src"> & {
  src: `/brand/${string}.svg`;
  width: number;
  height: number;
};

/** The logo SVGs from /public/brand. next/image can't optimise SVGs, so a plain img keeps its runtime off every page. */
export function BrandLogo({ loading = "lazy", ...props }: BrandLogoProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="Flowers Kitchen" loading={loading} decoding="async" {...props} />;
}
