import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { env } from "./env";
import { supabase } from "./supabase-server";

// Sliding-window rate limits stored in public.rate_limit_hits (migration 005). Keys are hashed
// with RATE_LIMIT_SALT, so the table never holds a raw IP address or phone number.

const TABLE = "rate_limit_hits";
const DEV_SALT = "flowers-kitchen-development";
const CLEANUP_ONE_IN = 50;
const KEEP_MS = 24 * 60 * 60_000;

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export const RATE_LIMITED_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

/** The visitor's IP: the first x-forwarded-for value (Vercel sets it). */
export async function clientIp() {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function hashKey(rawKey: string) {
  return createHash("sha256")
    .update((env.RATE_LIMIT_SALT ?? DEV_SALT) + rawKey)
    .digest("hex");
}

async function deleteOldHits() {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .lt("created_at", new Date(Date.now() - KEEP_MS).toISOString());
  if (error) console.error("[rate-limit] Cleanup failed:", error.message);
}

/**
 * Allows at most `limit` attempts per `windowMinutes` for `rawKey` in `bucket`, recording each
 * allowed attempt; refused attempts aren't recorded. If the table can't be reached the attempt
 * is allowed and logged, so a database problem never blocks a real customer.
 */
export async function hit(
  bucket: string,
  rawKey: string,
  limit: number,
  windowMinutes: number,
): Promise<RateLimitResult> {
  if (Math.random() < 1 / CLEANUP_ONE_IN) after(deleteOldHits);

  const windowMs = windowMinutes * 60_000;
  const keyHash = hashKey(rawKey);
  const now = Date.now();

  const recent = await supabase
    .from(TABLE)
    .select("created_at")
    .eq("bucket", bucket)
    .eq("key_hash", keyHash)
    .gte("created_at", new Date(now - windowMs).toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (recent.error) {
    console.error(`[rate-limit] Could not check ${bucket}; allowing:`, recent.error.message);
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (recent.data.length >= limit) {
    const oldest = Date.parse(recent.data[0].created_at);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }

  // The app server's clock writes created_at, so the window above compares like with like.
  const inserted = await supabase
    .from(TABLE)
    .insert({ bucket, key_hash: keyHash, created_at: new Date(now).toISOString() });
  if (inserted.error) console.error(`[rate-limit] Could not record ${bucket}:`, inserted.error.message);
  return { ok: true, retryAfterSeconds: 0 };
}
