export async function register() {
  // Fail at server start, not on the first enquiry, if configuration is missing.
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./lib/env");
}
