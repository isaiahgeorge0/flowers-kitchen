"use client";

const stepButton =
  "inline-flex size-11 items-center justify-center rounded-sm border border-hairline bg-paper text-xl leading-none text-pimento transition-colors duration-300 ease-out hover:border-pimento disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-hairline";

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
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={value <= 1 && min === 0 ? "Remove" : "One fewer"}
      >
        <span aria-hidden>−</span>
      </button>
      <output aria-live="polite" className="min-w-[2ch] text-center text-lg font-semibold tabular-nums">
        {value}
      </output>
      <button type="button" className={stepButton} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="One more">
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}
