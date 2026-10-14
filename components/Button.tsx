import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "on-dark";
export type ButtonSize = "md" | "lg";

const base =
  "group/button inline-flex items-center justify-center gap-2.5 rounded-pill text-[15px] font-semibold uppercase leading-none tracking-[0.08em] whitespace-nowrap transition-[background-color,color,border-color,translate] duration-300 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-75 disabled:active:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-sorrel text-cream hover:bg-sorrel-deep disabled:bg-sorrel",
  secondary:
    "border border-pimento text-pimento hover:bg-pimento/[0.07] disabled:bg-transparent",
  ghost:
    "text-pimento decoration-1 underline-offset-[6px] hover:underline",
  "on-dark":
    "border border-cream text-cream hover:bg-cream/[0.12] disabled:bg-transparent",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-6",
  lg: "min-h-13 px-8",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  const pad = variant === "ghost" ? sizes[size].replace(/px-\d+/, "px-1") : sizes[size];
  return `${base} ${variants[variant]} ${pad} ${className}`.trim();
}

/** Trailing arrow that nudges right on hover. Use inside any `buttonClasses` element. */
export function ButtonArrow() {
  return (
    <ArrowRight
      aria-hidden
      strokeWidth={1.5}
      className="-mr-1 size-[18px] shrink-0 transition-transform duration-300 ease-out group-hover/button:translate-x-0.5"
    />
  );
}

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; arrow?: boolean };
type ButtonProps = ComponentProps<"button"> & StyleProps;
type LinkButtonProps = ComponentProps<typeof Link> & StyleProps;

function withArrow(children: ReactNode, arrow?: boolean) {
  return arrow ? (
    <>
      <span>{children}</span>
      <ButtonArrow />
    </>
  ) : (
    children
  );
}

export function Button({
  variant,
  size,
  arrow,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
      {withArrow(children, arrow)}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  arrow,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {withArrow(children, arrow)}
    </Link>
  );
}

/** Buttons on one baseline with a 12px gap; stacks to equal full-width buttons on phones. */
export function ButtonGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      {children}
    </div>
  );
}
