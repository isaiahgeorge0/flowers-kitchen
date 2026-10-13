import { SidesSentence } from "@/components/SidesSentence";
import {
  CATERING_CONFIG,
  FIELD_LIMITS,
  OCCASIONS,
  SERVICE_STYLES,
  guestsInRange,
  tablesFor,
  todayISO,
  type CateringEvent,
  type StepErrors,
} from "@/lib/catering";
import { BOXES } from "@/lib/menu";
import {
  ChoiceCard,
  FieldError,
  TextField,
  errorId,
  fieldId,
  inputClasses,
} from "./fields";

export const STEP_HEADING_ID = "catering-step-heading";

export type StepProps = {
  event: CateringEvent;
  errors: StepErrors;
  update: (patch: Partial<CateringEvent>) => void;
  toggle: (field: "mains" | "extras", value: string) => void;
};

const subheading = "font-display text-[22px] font-semibold leading-snug";

export function OccasionStep({ event, errors, update }: StepProps) {
  return (
    <>
      <div
        role="radiogroup"
        aria-labelledby={STEP_HEADING_ID}
        aria-describedby={errors.occasion ? errorId("occasion") : undefined}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
      >
        {OCCASIONS.map((occasion) => (
          <ChoiceCard
            key={occasion.value}
            type="radio"
            name="occasion"
            value={occasion.value}
            checked={event.occasion === occasion.value}
            onChange={() => update({ occasion: occasion.value })}
            label={occasion.label}
            description={occasion.description}
          />
        ))}
      </div>
      <FieldError name="occasion" error={errors.occasion} />
    </>
  );
}

const QUICK_GUESTS = [20, 50, 100, 150];

export function GuestsStep({ event, errors, update }: StepProps) {
  const { min, max, step } = CATERING_CONFIG.guests;
  const valid = guestsInRange(event.guests);
  const sliderValue = Math.min(max, Math.max(min, event.guests || min));

  return (
    <>
      <label htmlFor={fieldId("guests")} className="block font-semibold">
        Number of guests
      </label>
      <div className="mt-3 flex items-center gap-5">
        <input
          type="range"
          name="guestsRange"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(e) => update({ guests: Number(e.target.value) })}
          aria-label="Number of guests"
          aria-valuetext={`${sliderValue} guests`}
          className="h-11 min-w-0 flex-1 cursor-pointer accent-sorrel"
        />
        <input
          id={fieldId("guests")}
          type="number"
          name="guests"
          inputMode="numeric"
          min={min}
          max={max}
          value={event.guests || ""}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            update({ guests: Number.isNaN(n) ? 0 : n });
          }}
          aria-invalid={errors.guests ? true : undefined}
          aria-describedby={errors.guests ? errorId("guests") : undefined}
          className={`${inputClasses} mt-0 w-24 text-center tabular-nums`}
        />
      </div>
      <FieldError name="guests" error={errors.guests} />

      <div role="group" aria-label="Quick picks" className="mt-6 flex flex-wrap gap-2">
        {QUICK_GUESTS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={event.guests === n}
            onClick={() => update({ guests: n })}
            className="min-h-11 min-w-16 rounded-sm border border-hairline bg-paper px-4 font-semibold tabular-nums transition-colors duration-300 ease-out hover:border-muted aria-pressed:border-sorrel aria-pressed:bg-sorrel aria-pressed:text-cream"
          >
            {n}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-6 text-lg text-muted">
        {valid ? `That's about ${tablesFor(event.guests)} tables` : "\u00A0"}
      </p>
    </>
  );
}

export function ServiceStep({ event, errors, update }: StepProps) {
  return (
    <>
      <div
        role="radiogroup"
        aria-labelledby={STEP_HEADING_ID}
        aria-describedby={errors.service ? errorId("service") : undefined}
        className="grid gap-3"
      >
        {SERVICE_STYLES.map((style) => (
          <ChoiceCard
            key={style.value}
            type="radio"
            name="service"
            value={style.value}
            checked={event.service === style.value}
            onChange={() => update({ service: style.value })}
            label={style.label}
            description={style.description}
          />
        ))}
      </div>
      <FieldError name="service" error={errors.service} />
    </>
  );
}

export function FoodStep({ event, errors, toggle }: StepProps) {
  const { maxMains, extras } = CATERING_CONFIG;
  const atLimit = event.mains.length >= maxMains;

  return (
    <>
      <SidesSentence
        prefix="Every box or portion comes with"
        className="text-lg text-muted"
      />

      <h3 id="catering-mains-heading" className={`mt-8 ${subheading}`}>
        Mains
      </h3>
      <p id="catering-mains-hint" className="mt-1 text-[15px] text-muted">
        Pick up to {maxMains}.
      </p>
      <div
        role="group"
        aria-labelledby="catering-mains-heading"
        aria-describedby={[
          "catering-mains-hint",
          errors.mains ? errorId("mains") : "",
        ]
          .join(" ")
          .trim()}
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
      >
        {BOXES.map((box) => {
          const checked = event.mains.includes(box.slug);
          return (
            <ChoiceCard
              key={box.slug}
              type="checkbox"
              name="mains"
              value={box.slug}
              checked={checked}
              disabled={atLimit && !checked}
              onChange={() => toggle("mains", box.slug)}
              label={box.name}
              compact
            />
          );
        })}
      </div>
      <FieldError name="mains" error={errors.mains} />
      <p aria-live="polite" className="mt-3 text-[15px] text-muted">
        {atLimit
          ? `That's ${maxMains} mains, the most you can pick. Untick one to swap it for another.`
          : ""}
      </p>

      <h3 id="catering-extras-heading" className={`mt-8 ${subheading}`}>
        Extras
      </h3>
      <div
        role="group"
        aria-labelledby="catering-extras-heading"
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        {extras.map((extra) => (
          <ChoiceCard
            key={extra}
            type="checkbox"
            name="extras"
            value={extra}
            checked={event.extras.includes(extra)}
            onChange={() => toggle("extras", extra)}
            label={extra}
            compact
          />
        ))}
      </div>
    </>
  );
}

export function WhenStep({ event, errors, update }: StepProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <TextField
        name="date"
        label="Date"
        type="date"
        min={todayISO()}
        value={event.date}
        onChange={(e) => update({ date: e.target.value })}
        error={errors.date}
      />
      <TextField
        name="time"
        label="Time"
        type="time"
        value={event.time}
        onChange={(e) => update({ time: e.target.value })}
        error={errors.time}
      />
      <div className="sm:col-span-2">
        <TextField
          name="postcode"
          label="Venue postcode"
          autoComplete="postal-code"
          autoCapitalize="characters"
          maxLength={FIELD_LIMITS.postcode}
          value={event.postcode}
          onChange={(e) => update({ postcode: e.target.value })}
          error={errors.postcode}
          className={`${inputClasses} max-w-48 uppercase`}
        />
      </div>
    </div>
  );
}

export function DetailsStep({ event, errors, update }: StepProps) {
  return (
    <div className="grid gap-6">
      <TextField
        name="name"
        label="Name"
        autoComplete="name"
        maxLength={FIELD_LIMITS.name}
        value={event.name}
        onChange={(e) => update({ name: e.target.value })}
        error={errors.name}
      />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        maxLength={FIELD_LIMITS.email}
        value={event.email}
        onChange={(e) => update({ email: e.target.value })}
        error={errors.email}
      />
      <TextField
        name="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        optional
        maxLength={FIELD_LIMITS.phone}
        value={event.phone}
        onChange={(e) => update({ phone: e.target.value })}
        error={errors.phone}
      />
      <div>
        <label htmlFor={fieldId("notes")} className="block font-semibold">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <p id={`${fieldId("notes")}-hint`} className="mt-1 text-[15px] text-muted">
          Dietary needs, venue access, anything else we should know.
        </p>
        <textarea
          id={fieldId("notes")}
          name="notes"
          rows={4}
          maxLength={FIELD_LIMITS.notes}
          value={event.notes}
          onChange={(e) => update({ notes: e.target.value })}
          aria-describedby={`${fieldId("notes")}-hint`}
          className={`${inputClasses} resize-y`}
        />
      </div>
    </div>
  );
}

export const STEP_COMPONENTS = [
  OccasionStep,
  GuestsStep,
  ServiceStep,
  FoodStep,
  WhenStep,
  DetailsStep,
];
