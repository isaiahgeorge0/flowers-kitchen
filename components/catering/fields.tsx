import type { ComponentProps, ReactNode } from "react";

export const fieldId = (name: string) => `catering-${name}`;
export const errorId = (name: string) => `catering-${name}-error`;

export const inputClasses =
  "mt-2 block min-h-12 w-full rounded-sm border border-hairline bg-paper px-4 py-2.5 text-[17px] text-pimento aria-invalid:border-sorrel";

export function FieldError({ name, error }: { name: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={errorId(name)} className="mt-2 text-[15px] text-sorrel">
      {error}
    </p>
  );
}

type ChoiceCardProps = {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
};

export function ChoiceCard({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  compact = false,
}: ChoiceCardProps) {
  return (
    <label
      className={`group flex cursor-pointer items-center gap-4 rounded-sm border border-hairline bg-paper transition-colors duration-300 ease-out hover:border-muted has-checked:border-sorrel has-checked:shadow-[inset_0_0_0_1px_var(--color-sorrel)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus-ring)] has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:border-hairline ${compact ? "min-h-14 px-4 py-3" : "min-h-20 px-5 py-4"}`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[15px] text-muted">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center border border-hairline text-cream group-has-checked:border-sorrel group-has-checked:bg-sorrel ${type === "radio" ? "rounded-full" : "rounded-sm"}`}
      >
        <svg
          viewBox="0 0 16 16"
          className="hidden size-3.5 group-has-checked:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      </span>
    </label>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "name" | "id"> & {
  name: string;
  label: string;
  error?: string;
  optional?: boolean;
  hint?: ReactNode;
};

export function TextField({
  name,
  label,
  error,
  optional,
  hint,
  ...inputProps
}: TextFieldProps) {
  const hintId = hint ? `${fieldId(name)}-hint` : undefined;
  const describedBy = [hintId, error ? errorId(name) : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={fieldId(name)} className="block font-semibold">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-[15px] text-muted">
          {hint}
        </p>
      )}
      <input
        id={fieldId(name)}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={inputClasses}
        {...inputProps}
      />
      <FieldError name={name} error={error} />
    </div>
  );
}
