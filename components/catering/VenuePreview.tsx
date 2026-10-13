"use client";

import dynamic from "next/dynamic";
import { catchError } from "next/error";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { serviceLabel, type CateringEvent } from "@/lib/catering";
import { VenuePreviewFallback } from "./VenuePreviewFallback";
import { describeRoom, planRoom } from "./venueLayout";

const VenueScene = dynamic(() => import("./VenueScene"), { ssr: false, loading: () => null });

function Fallback({ event }: { event: CateringEvent }) {
  return (
    <div className="absolute inset-0">
      <VenuePreviewFallback event={event} />
    </div>
  );
}

function ReportFailure({ onFailure }: { onFailure: () => void }) {
  useEffect(onFailure, [onFailure]);
  return null;
}

const SceneBoundary = catchError((props: { onFailure: () => void }) => (
  <ReportFailure onFailure={props.onFailure} />
));

let webglSupport: boolean | undefined;
function hasWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      webglSupport = gl !== null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const noSubscription = () => () => {};

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function VenuePreview({ event }: { event: CateringEvent }) {
  const ref = useRef<HTMLDivElement>(null);
  const webgl = useSyncExternalStore(noSubscription, hasWebGL, () => false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const canRotate = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "100px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleReady = useCallback(() => setReady(true), []);
  const handleFailure = useCallback(() => setFailed(true), []);

  const showScene = webgl && !failed;
  const { tables } = planRoom(event);
  const service = serviceLabel(event.service);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={describeRoom(event)}
      className={`relative aspect-4/3 touch-pan-y overflow-hidden rounded-md bg-mountain lg:aspect-16/10 ${
        showScene && canRotate ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {(!showScene || !ready) && <Fallback event={event} />}

      {showScene && (
        <SceneBoundary onFailure={handleFailure}>
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
          >
            <VenueScene
              event={event}
              active={inView}
              reducedMotion={reducedMotion}
              canRotate={canRotate}
              onReady={handleReady}
              onContextLost={handleFailure}
            />
          </div>
          {ready && (
            <p
              aria-hidden="true"
              className="pointer-events-none absolute top-2 left-2 rounded-sm bg-cream/95 px-1.5 py-0.5 text-[11px] font-semibold text-pimento sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[13px] md:top-4 md:left-4"
            >
              {tables} {tables === 1 ? "table" : "tables"}
              {service && <>{"\u00a0· "}{service}</>}
            </p>
          )}
        </SceneBoundary>
      )}
    </div>
  );
}
