"use client";

import { Minus, Plus } from "lucide-react";

const stepButton =
  "inline-flex size-11 items-center justify-center rounded-pill text-pimento transition-colors duration-300 ease-out hover:bg-pimento/[0.07] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-pill border border-hairline bg-paper" role="group" aria-label={label}>
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={value <= 1 && min === 0 ? "Remove" : "One fewer"}
      >
        <Minus aria-hidden strokeWidth={1.5} className="size-[18px]" />
      </button>
      <output aria-live="polite" className="min-w-[3ch] text-center text-[17px] font-semibold tabular-nums">
        {value}
      </output>
      <button type="button" className={stepButton} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="One more">
        <Plus aria-hidden strokeWidth={1.5} className="size-[18px]" />
      </button>
    </div>
  );
}
