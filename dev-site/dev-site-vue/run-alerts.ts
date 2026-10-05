/**
 * Sound + desktop-notification feedback for when a run stops on its own —
 * finishing or failing — so you don't have to keep the tab in view (or
 * even in focus) while a workflow runs unattended (e.g. with auto-
 * continue on). No audio *files*: both sounds are synthesized with the
 * Web Audio API so there's nothing to host or license — a bright two-note
 * "ding" for success, a short pitch-dropping "quack" for failure (a nod
 * to the classic Mac OS alert sounds).
 */

const VOLUME_STORAGE_KEY = "dev-site.run-alerts.volume";
const MUTED_STORAGE_KEY = "dev-site.run-alerts.muted";
const DEFAULT_VOLUME = 0.5;

function readStoredNumber(key: string, fallback: number): number {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === "true";
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private-browsing/quota errors — a per-viewer convenience not
    // persisting isn't worth failing over.
  }
}

function clampVolume(v: number): number {
  return Math.min(1, Math.max(0, v));
}

let volume = clampVolume(readStoredNumber(VOLUME_STORAGE_KEY, DEFAULT_VOLUME));
let muted = readStoredBoolean(MUTED_STORAGE_KEY, false);

export function getVolume(): number {
  return volume;
}

/** 0–1. Persisted immediately. */
export function setVolume(next: number): void {
  volume = clampVolume(next);
  writeStored(VOLUME_STORAGE_KEY, String(volume));
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  writeStored(MUTED_STORAGE_KEY, String(muted));
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

function effectiveVolume(): number {
  return muted ? 0 : volume;
}

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return undefined;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
}

/** Test-only: module-level state otherwise outlives any one test file's re-stubbed localStorage/globals. */
export function __resetRunAlertsStateForTests(): void {
  audioContext = undefined;
  volume = clampVolume(readStoredNumber(VOLUME_STORAGE_KEY, DEFAULT_VOLUME));
  muted = readStoredBoolean(MUTED_STORAGE_KEY, false);
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
  const vol = effectiveVolume();
  if (vol <= 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  if (frequencyEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(frequencyEnd, startTime + duration * 0.7);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak * vol, startTime + 0.015);
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

/**
 * Best-effort desktop notification. Muting only silences sound, not
 * notifications — those are separately gated purely by browser
 * permission. Logs *why* nothing was shown rather than failing silently:
 * this is the kind of thing ("I granted permission but saw nothing") that
 * has no other visible feedback to debug from otherwise.
 */
export function notify(title: string, body: string): void {
  if (typeof window === "undefined" || !window.Notification) {
    console.warn("[run-alerts] Notification API not available in this browser/context");
    return;
  }
  if (window.Notification.permission !== "granted") {
    console.warn(
      `[run-alerts] not showing notification — Notification.permission is "${window.Notification.permission}"`,
    );
    return;
  }
  try {
    new window.Notification(title, { body });
  } catch (error) {
    console.error("[run-alerts] failed to show notification", error);
  }
}
