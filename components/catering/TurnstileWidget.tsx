"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

// Cloudflare Turnstile, the catering form's only third-party request. The script loads when
// the last step appears, not with the page.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<Turnstile> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export const turnstileEnabled = Boolean(SITE_KEY);

export type TurnstileHandle = {
  /** The current token, or null if the check hasn't passed yet (or has expired). */
  token(): string | null;
  /** Tokens work once: get a fresh one after every attempt that didn't succeed. */
  reset(): void;
};

export function TurnstileWidget({ ref, className = "" }: { ref: Ref<TurnstileHandle>; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      token: () => token.current,
      reset: () => {
        token.current = null;
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        widgetId.current = turnstile.render(container.current, {
          sitekey: SITE_KEY,
          action: "catering",
          theme: "light",
          size: "flexible",
          callback: (value: string) => {
            token.current = value;
          },
          "expired-callback": () => {
            token.current = null;
          },
          "error-callback": () => {
            token.current = null;
          },
        });
      })
      .catch(() => {
        // Without a token the form asks the visitor to try again or message us on Instagram.
      });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      token.current = null;
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={container} className={`min-h-[65px] ${className}`} />;
}
