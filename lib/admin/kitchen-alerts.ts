// Ported from the template's lib/admin-orders/play-new-order-alert.ts and
// new-order-sound-preference.ts: a short two-tone WebAudio beep, off until staff switch it on.

const SOUND_PREFERENCE_KEY = "fk_admin_kitchen_sound_alerts_enabled";

let sharedContext: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  sharedContext ??= new AC();
  return sharedContext;
}

export function readSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSoundEnabled(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(SOUND_PREFERENCE_KEY, "1");
    else window.localStorage.removeItem(SOUND_PREFERENCE_KEY);
  } catch {}
}

function beep(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  const tone = (frequency: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  };
  tone(880, t0, 0.11);
  tone(1174.66, t0 + 0.13, 0.14);
  // Played twice so it cuts through a noisy kitchen.
  tone(880, t0 + 0.5, 0.11);
  tone(1174.66, t0 + 0.63, 0.14);
}

/** Resumes audio (needs a tap the first time) and beeps. False if the browser blocked sound. */
export async function playNewOrderAlert(): Promise<boolean> {
  const ctx = audioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return false;
    beep(ctx);
    return true;
  } catch {
    return false;
  }
}
