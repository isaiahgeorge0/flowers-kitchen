import "server-only";
import { env } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let warnedMissingKey = false;

/**
 * Checks a Cloudflare Turnstile token. "failed" means the visitor didn't pass (or the token was
 * missing, reused or expired); a Cloudflare outage throws, so the caller can show its usual
 * "something went wrong" message instead of blaming the visitor.
 */
export async function verifyTurnstile(token: unknown, ip: string): Promise<"passed" | "failed"> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn("[turnstile] TURNSTILE_SECRET_KEY is not set; skipping the check (development only).");
    }
    return "passed";
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return "failed";

  const body = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);
  const response = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`TURNSTILE_HTTP_${response.status}`);

  const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  if (result.success === true) return "passed";
  console.warn("[turnstile] Check failed:", result["error-codes"] ?? []);
  return "failed";
}
