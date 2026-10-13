"use client";

import { useEffect, useReducer, useRef, useState, useTransition, type FormEvent } from "react";
import { submitEnquiry, type EnquiryResult } from "@/app/catering/actions";
import { Button } from "@/components/Button";
import { Eyebrow } from "@/components/Eyebrow";
import {
  CATERING_CONFIG,
  ENQUIRY_MESSAGES,
  OCCASIONS,
  SERVICE_STYLES,
  STEPS,
  emptyEvent,
  estimate,
  estimateLines,
  formatDate,
  mainName,
  occasionLabel,
  serviceLabel,
  tablesFor,
  todayISO,
  validateStep,
  type CateringEvent,
  type Occasion,
  type ServiceStyle,
  type StepErrors,
} from "@/lib/catering";
import { BOXES } from "@/lib/menu";
import { instagram } from "@/lib/site";
import { h2, textLink } from "@/lib/typography";
import { STEP_COMPONENTS, STEP_HEADING_ID } from "./Steps";
import { SummaryPanel } from "./SummaryPanel";
import { VenuePreview } from "./VenuePreview";

const STORAGE_KEY = "flowers-kitchen:catering-builder";
const TOTAL_STEPS = STEPS.length;
const SUCCESS_HEADING_ID = "catering-success-heading";
const HONEYPOT_NAME = "website";

type Saved = { step: number; event: CateringEvent };

type State = {
  hydrated: boolean;
  step: number;
  event: CateringEvent;
  errors: StepErrors;
  errorTick: number;
  focusField: string | null;
  submitted: CateringEvent | null;
};

type Action =
  | { type: "restore"; saved: Saved | null }
  | { type: "update"; patch: Partial<CateringEvent> }
  | { type: "toggle"; field: "mains" | "extras"; value: string }
  | { type: "invalid"; errors: StepErrors }
  | { type: "goto"; step: number }
  | { type: "submitted" };

const initialState: State = {
  hydrated: false,
  step: 1,
  event: emptyEvent(),
  errors: {},
  errorTick: 0,
  focusField: null,
  submitted: null,
};

function withoutErrors(errors: StepErrors, keys: string[]) {
  const next = { ...errors };
  for (const key of keys) delete next[key as keyof CateringEvent];
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restore":
      if (state.hydrated) return state;
      return { ...state, ...action.saved, hydrated: true };
    case "update":
      return {
        ...state,
        event: { ...state.event, ...action.patch },
        errors: withoutErrors(state.errors, Object.keys(action.patch)),
      };
    case "toggle": {
      const list = state.event[action.field];
      const has = list.includes(action.value);
      if (
        !has &&
        action.field === "mains" &&
        list.length >= CATERING_CONFIG.maxMains
      ) {
        return state;
      }
      return {
        ...state,
        event: {
          ...state.event,
          [action.field]: has
            ? list.filter((v) => v !== action.value)
            : [...list, action.value],
        },
        errors: withoutErrors(state.errors, [action.field]),
      };
    }
    case "invalid":
      return {
        ...state,
        errors: action.errors,
        errorTick: state.errorTick + 1,
        focusField: Object.keys(action.errors)[0] ?? null,
      };
    case "goto":
      return { ...state, step: action.step, errors: {} };
    case "submitted":
      return { ...state, submitted: state.event };
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown, allowed: readonly string[]) =>
  Array.isArray(v)
    ? v.filter((s): s is string => typeof s === "string" && allowed.includes(s))
    : [];

function parseSaved(raw: string | null): Saved | null {
  if (!raw) return null;
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object") return null;
  const { step, event } = data as { step?: unknown; event?: unknown };
  const e = (event && typeof event === "object" ? event : {}) as Record<
    string,
    unknown
  >;
  const base = emptyEvent();

  return {
    step:
      typeof step === "number" && step >= 1 && step <= TOTAL_STEPS
        ? Math.floor(step)
        : 1,
    event: {
      occasion: OCCASIONS.some((o) => o.value === e.occasion)
        ? (e.occasion as Occasion)
        : null,
      guests:
        typeof e.guests === "number" && Number.isFinite(e.guests)
          ? e.guests
          : base.guests,
      service: SERVICE_STYLES.some((s) => s.value === e.service)
        ? (e.service as ServiceStyle)
        : null,
      mains: strs(
        e.mains,
        BOXES.map((box) => box.slug),
      ).slice(0, CATERING_CONFIG.maxMains),
      extras: strs(e.extras, CATERING_CONFIG.extras),
      date: str(e.date),
      time: str(e.time),
      postcode: str(e.postcode),
      name: str(e.name),
      email: str(e.email),
      phone: str(e.phone),
      notes: str(e.notes),
    },
  };
}

export function CateringBuilder() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { step, event, errors } = state;
  const formRef = useRef<HTMLFormElement>(null);
  const focusStepHeading = useRef(false);
  const sendErrorRef = useRef<HTMLParagraphElement>(null);
  const [sending, startSending] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let saved: Saved | null = null;
    try {
      saved = parseSaved(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      saved = null;
    }
    dispatch({ type: "restore", saved });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      if (state.submitted) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        const saved: Saved = { step, event };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
    } catch {
      // Storage can be unavailable (private browsing, quota); progress just won't persist.
    }
  }, [state.hydrated, state.submitted, step, event]);

  useEffect(() => {
    if (!focusStepHeading.current) return;
    focusStepHeading.current = false;
    document.getElementById(STEP_HEADING_ID)?.focus();
  }, [step]);

  useEffect(() => {
    if (!state.focusField) return;
    formRef.current
      ?.querySelector<HTMLElement>(`[name="${state.focusField}"]:not([disabled])`)
      ?.focus();
  }, [state.errorTick, state.focusField]);

  useEffect(() => {
    if (state.submitted) document.getElementById(SUCCESS_HEADING_ID)?.focus();
  }, [state.submitted]);

  useEffect(() => {
    if (sendError) sendErrorRef.current?.focus();
  }, [sendError]);

  function goTo(next: number) {
    focusStepHeading.current = true;
    setSendError(null);
    dispatch({ type: "goto", step: next });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const stepErrors = validateStep(step, event, todayISO());
    if (Object.keys(stepErrors).length > 0) {
      dispatch({ type: "invalid", errors: stepErrors });
      return;
    }
    if (step < TOTAL_STEPS) {
      goTo(step + 1);
      return;
    }
    const website = new FormData(e.currentTarget).get(HONEYPOT_NAME);
    setSendError(null);
    startSending(async () => {
      let result: EnquiryResult;
      try {
        result = await submitEnquiry({
          ...event,
          website: typeof website === "string" ? website : "",
        });
      } catch {
        result = { ok: false, message: ENQUIRY_MESSAGES.failed };
      }
      if (result.ok) dispatch({ type: "submitted" });
      else setSendError(result.message);
    });
  }

  if (state.submitted) return <Success event={state.submitted} />;

  const StepContent = STEP_COMPONENTS[step - 1];
  const stepProps = {
    event,
    errors,
    update: (patch: Partial<CateringEvent>) => dispatch({ type: "update", patch }),
    toggle: (field: "mains" | "extras", value: string) =>
      dispatch({ type: "toggle", field, value }),
  };
  const submitLabel = sending
    ? "Sending…"
    : step === TOTAL_STEPS
      ? "Send my enquiry"
      : "Continue";
  const estimateText = estimateLines(estimate(event)).perHead;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Event builder"
      aria-busy={sending || undefined}
      className="relative"
    >
      <div aria-hidden="true" className="absolute -left-[10000px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="catering-website">Website</label>
        <input
          id="catering-website"
          type="text"
          name={HONEYPOT_NAME}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <div className="grid gap-10 lg:grid-cols-[55fr_45fr] lg:gap-12 xl:gap-16">
        <aside
          aria-label="Your event so far"
          className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start"
        >
          <VenuePreview event={event} />
          <div className="hidden lg:block">
            <SummaryPanel event={event} />
          </div>
        </aside>

        <div>
          <Eyebrow>
            Step {step} of {TOTAL_STEPS}
          </Eyebrow>
          <h2
            id={STEP_HEADING_ID}
            tabIndex={-1}
            className={`mt-5 scroll-mt-28 outline-none ${h2}`}
          >
            {STEPS[step - 1]}
          </h2>
          <div aria-hidden className="mt-6 h-0.5 bg-hairline">
            <div
              className="h-full bg-sorrel transition-[width] duration-400 ease-out"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>

          <div key={step} className="mt-8 motion-safe:animate-fade-rise">
            <StepContent {...stepProps} />
          </div>

          {step === TOTAL_STEPS && (
            <>
              <div className="mt-10 lg:hidden">
                <SummaryPanel event={event} />
              </div>

              {sendError && (
                <p
                  ref={sendErrorRef}
                  tabIndex={-1}
                  className="mt-8 rounded-sm border border-sorrel bg-paper p-4 outline-none"
                >
                  <MessageWithInstagram message={sendError} />
                </p>
              )}

              {/* TODO: Link to a privacy policy before launch. */}
              <p className="mt-8 text-[13px] text-muted">
                We&apos;ll only use your details to reply to this enquiry.
              </p>
            </>
          )}

          <div className="mt-10 hidden items-center justify-between gap-4 lg:flex">
            {step > 1 ? (
              <Button variant="secondary" disabled={sending} onClick={() => goTo(step - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={sending}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 -mx-6 mt-10 border-t border-hairline bg-cream px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:-mx-8 md:px-8 lg:hidden">
        <div aria-hidden className="flex items-baseline justify-between gap-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">
            Step {step} of {TOTAL_STEPS}
          </p>
          <p className="font-display text-lg font-semibold text-sorrel">
            {estimateText}
          </p>
        </div>
        <div className="mt-3 flex gap-3">
          {step > 1 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={sending}
              onClick={() => goTo(step - 1)}
            >
              Back
            </Button>
          )}
          <Button type="submit" size="sm" disabled={sending} className="flex-1">
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Every enquiry message ends "…message us on Instagram."; that word becomes the link. */
function MessageWithInstagram({ message }: { message: string }) {
  const suffix = "Instagram.";
  if (!message.endsWith(suffix)) return message;
  return (
    <>
      {message.slice(0, -suffix.length)}
      <a
        href={instagram.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${textLink} decoration-sorrel`}
      >
        Instagram<span className="sr-only"> (opens in a new tab)</span>
      </a>
      .
    </>
  );
}

function Success({ event }: { event: CateringEvent }) {
  const rows: [string, string][] = [
    ["Occasion", occasionLabel(event.occasion) ?? "—"],
    ["Guests", `${event.guests} · about ${tablesFor(event.guests)} tables`],
    ["Service", serviceLabel(event.service) ?? "—"],
    ["Mains", event.mains.map(mainName).join(", ") || "—"],
    ["Extras", event.extras.join(", ") || "—"],
    ["Date", formatDate(event.date) ?? "—"],
    ["Time", event.time || "—"],
    ["Venue postcode", event.postcode.toUpperCase() || "—"],
    ["Name", event.name],
    ["Email", event.email],
    ["Phone", event.phone || "—"],
    ["Notes", event.notes || "—"],
  ];

  return (
    <div className="max-w-3xl motion-safe:animate-fade-rise">
      <h2
        id={SUCCESS_HEADING_ID}
        tabIndex={-1}
        className={`scroll-mt-28 outline-none ${h2}`}
      >
        Thank you — we&apos;ve got it.
      </h2>
      <p className="mt-6 text-lg">
        Asher or Tajay will be in touch soon with your quote.
      </p>

      <section
        aria-labelledby="catering-sent-heading"
        className="mt-10 rounded-sm border border-hairline bg-paper p-6"
      >
        <h3
          id="catering-sent-heading"
          className="text-[13px] font-semibold uppercase leading-none tracking-[0.32em] text-sorrel"
        >
          Your enquiry
        </h3>
        <dl className="mt-5 divide-y divide-hairline text-[15px]">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="break-words whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
