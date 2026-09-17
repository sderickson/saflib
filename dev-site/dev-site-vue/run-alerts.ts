/**
 * Sound + desktop-notification feedback for when a run stops on its own —
 * finishing or failing — so you don't have to keep the tab in view (or
 * even in focus) while a workflow runs unattended (e.g. with auto-
 * continue on). No audio *files*: both sounds are synthesized with the
 * Web Audio API so there's nothing to host or license — a bright two-note
 * "ding" for success, a short pitch-dropping "quack" for failure (a nod
 * to the classic Mac OS alert sounds).
 */

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return undefined;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
}

/** Test-only: module-level state (the lazily-created `AudioContext`) otherwise outlives any one test file's re-stubbed globals. */
export function __resetAudioContextForTests(): void {
  audioContext = undefined;
}

/**
 * Call this from an actual click handler (Advance/Retry/auto-continue) —
 * browsers suspend a freshly-created `AudioContext` until it's resumed
 * from within a user gesture. Without this, a sound triggered later by an
 * unattended auto-continue chain (no gesture at that moment) would be
 * silently blocked.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") void ctx.resume();
}

function playTone(
  ctx: AudioContext,
  type: OscillatorType,
  startTime: number,
  duration: number,
  frequency: number,
  frequencyEnd: number | undefined,
  gainPeak: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  if (frequencyEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(frequencyEnd, startTime + duration * 0.7);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** A run finished successfully. */
export function playSuccessBell(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(ctx, "sine", now, 0.5, 1318.5, undefined, 0.2); // E6
  playTone(ctx, "sine", now + 0.12, 0.6, 1568.0, undefined, 0.2); // G6
}

/** A run stopped on a step error. */
export function playFailureQuack(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(ctx, "sawtooth", now, 0.16, 320, 180, 0.16);
  playTone(ctx, "sawtooth", now + 0.22, 0.16, 320, 180, 0.16);
}

/** Best-effort, asks once — a no-op if the browser doesn't support notifications or the person already answered. */
export function requestNotificationPermission(): void {
  // `!window.Notification` (not `"Notification" in window`) so a test
  // stubbing the global to `undefined` is still treated as unsupported —
  // `in` only checks the property exists, not that it holds anything.
  if (typeof window === "undefined" || !window.Notification) return;
  if (window.Notification.permission === "default") {
    void window.Notification.requestPermission();
  }
}

/** Best-effort desktop notification — silently does nothing without permission or support. */
export function notify(title: string, body: string): void {
  if (typeof window === "undefined" || !window.Notification) return;
  if (window.Notification.permission !== "granted") return;
  try {
    new window.Notification(title, { body });
  } catch {
    // Some environments (e.g. a notification requiring a service worker)
    // reject the plain constructor — a missed notification isn't worth
    // failing the page over.
  }
}
