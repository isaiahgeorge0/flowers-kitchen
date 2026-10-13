export function NumberedSteps({
  steps,
  className = "",
}: {
  steps: readonly string[];
  className?: string;
}) {
  return (
    <ol className={`grid gap-10 md:grid-cols-3 md:gap-8 ${className}`}>
      {steps.map((step, i) => (
        <li key={step} className="border-t border-hairline pt-6">
          <span
            aria-hidden
            className="block font-display text-5xl font-semibold leading-none text-sorrel"
          >
            {i + 1}
          </span>
          <p className="mt-4 max-w-xs text-lg">{step}</p>
        </li>
      ))}
    </ol>
  );
}
