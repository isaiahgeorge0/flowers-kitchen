"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { supabasePublicEnv } from "@/lib/supabase-public-env";

// Ported from the template's admin-orders-realtime-refresh.tsx. Uses the publishable key and the
// signed-in staff session (RLS decides what arrives). Realtime events only trigger a server
// refresh; their payloads are never shown.
const DEBOUNCE_MS = 1000;
const MAX_BATCH_MS = 2200;
const MIN_REFRESH_GAP_MS = 1400;
const MAX_RECONNECT_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 20_000;
// Catches anything missed while the tablet slept or the connection dropped.
const SAFETY_REFRESH_MS = 60_000;

export type RealtimeState = "connecting" | "live" | "reconnecting" | "offline";

export function useRealtimeRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<RealtimeState>("connecting");

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let maxBatchTimer: ReturnType<typeof setTimeout> | null = null;
    let lastRefreshAt = 0;

    const clearBatch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (maxBatchTimer) clearTimeout(maxBatchTimer);
      debounceTimer = null;
      maxBatchTimer = null;
    };

    function flush(forced: boolean) {
      clearBatch();
      if (cancelled) return;
      const elapsed = Date.now() - lastRefreshAt;
      if (!forced && elapsed < MIN_REFRESH_GAP_MS) {
        debounceTimer = setTimeout(() => flush(true), MIN_REFRESH_GAP_MS - elapsed);
        return;
      }
      lastRefreshAt = Date.now();
      startTransition(() => router.refresh());
    }

    function schedule() {
      maxBatchTimer ??= setTimeout(() => flush(true), MAX_BATCH_MS);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => flush(false), DEBOUNCE_MS);
    }

    const { url, publishableKey } = supabasePublicEnv();
    const supabase = createBrowserClient(url, publishableKey);
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function reconnectLater() {
      if (cancelled) return;
      attempt += 1;
      if (attempt > MAX_RECONNECT_ATTEMPTS) {
        setState("offline");
        return;
      }
      setState("reconnecting");
      retryTimer = setTimeout(subscribe, Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempt - 1)));
    }

    async function subscribe() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setState("offline");
        return;
      }
      if (channel) await supabase.removeChannel(channel);
      if (cancelled) return;
      // Realtime checks RLS with the staff member's token.
      await supabase.realtime.setAuth(data.session.access_token);
      setState("connecting");
      const current = supabase
        .channel("admin-kitchen-board")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, schedule)
        .subscribe((status) => {
          if (cancelled || channel !== current) return;
          if (status === "SUBSCRIBED") {
            attempt = 0;
            setState("live");
            // Pick up anything that changed while we were connecting.
            flush(false);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            reconnectLater();
          }
        });
      channel = current;
    }

    void subscribe();

    const safety = setInterval(() => flush(false), SAFETY_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      flush(true);
      if (attempt > MAX_RECONNECT_ATTEMPTS) {
        attempt = 0;
        void subscribe();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(safety);
      clearBatch();
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return { state, updating: isPending };
}
