import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "inverse";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center rounded-sm text-[15px] font-semibold uppercase leading-none tracking-[0.08em] transition-colors duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-75";

const variants: Record<Variant, string> = {
  primary: "bg-sorrel text-cream hover:bg-pimento disabled:bg-sorrel",
  secondary:
    "border border-pimento text-pimento hover:bg-pimento hover:text-cream disabled:bg-transparent disabled:text-pimento",
  inverse:
    "border border-cream text-cream hover:bg-cream hover:text-sorrel disabled:bg-transparent disabled:text-cream",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-6",
  sm: "min-h-11 px-4",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className = "",
) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

type StyleProps = { variant?: Variant; size?: Size };
type ButtonProps = ComponentProps<"button"> & StyleProps;
type LinkButtonProps = ComponentProps<typeof Link> & StyleProps;

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
