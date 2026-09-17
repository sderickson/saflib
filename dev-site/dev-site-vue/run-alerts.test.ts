import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  unlockAudio,
  playSuccessBell,
  playFailureQuack,
  requestNotificationPermission,
  notify,
  getVolume,
  setVolume,
  isMuted,
  setMuted,
  toggleMuted,
  __resetRunAlertsStateForTests,
} from "./run-alerts.ts";

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class FakeOscillator {
  type = "sine";
  frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  state: "running" | "suspended" = "running";
  resume = vi.fn(() => {
    this.state = "running";
    return Promise.resolve();
  });
  createOscillator = vi.fn(() => new FakeOscillator());
  createGain = vi.fn(() => new FakeGain());
  destination = {};
  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

describe("run-alerts", () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    localStorage.clear();
    __resetRunAlertsStateForTests();
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays a success bell by creating oscillators against the (lazily-created) AudioContext", () => {
    playSuccessBell();
    expect(FakeAudioContext.instances).toHaveLength(1);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("plays a failure quack too, reusing the same AudioContext instance", () => {
    playSuccessBell();
    playFailureQuack();
    // Only one AudioContext is ever created — lazily, then reused.
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it("resumes a suspended AudioContext when unlocking from a user gesture", () => {
    playSuccessBell();
    const ctx = FakeAudioContext.instances[0];
    ctx.state = "suspended";
    unlockAudio();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("does not throw when there's no AudioContext support at all", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(() => playSuccessBell()).not.toThrow();
    expect(() => playFailureQuack()).not.toThrow();
    expect(() => unlockAudio()).not.toThrow();
  });

  it("scales the gain applied to each tone by the current volume", () => {
    setVolume(0.4);
    playSuccessBell();
    const ctx = FakeAudioContext.instances[0];
    const gains = ctx.createGain.mock.results.map((r) => r.value as FakeGain);
    // Peak gain (0.2) * volume (0.4) = 0.08 for each of the two tones.
    for (const gain of gains) {
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        expect.closeTo(0.08, 5),
        expect.anything(),
      );
    }
  });

  it("plays nothing (no oscillators at all) while muted", () => {
    setMuted(true);
    playSuccessBell();
    expect(FakeAudioContext.instances[0]?.createOscillator).not.toHaveBeenCalled();
  });

  it("mute/volume state is persisted to localStorage across module state resets", () => {
    setVolume(0.75);
    setMuted(true);
    __resetRunAlertsStateForTests(); // simulates a fresh page load re-reading localStorage
    expect(getVolume()).toBeCloseTo(0.75);
    expect(isMuted()).toBe(true);
  });

  it("toggleMuted flips and returns the new state", () => {
    setMuted(false);
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMuted()).toBe(false);
    expect(isMuted()).toBe(false);
  });

  it("clamps volume to [0, 1]", () => {
    setVolume(5);
    expect(getVolume()).toBe(1);
    setVolume(-2);
    expect(getVolume()).toBe(0);
  });
});

describe("notifications", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests permission only when it hasn't been decided yet", () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });

    requestNotificationPermission();

    expect(requestPermission).toHaveBeenCalled();
  });

  it("does not re-prompt once permission has already been granted or denied", () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { permission: "granted", requestPermission });
    requestNotificationPermission();
    expect(requestPermission).not.toHaveBeenCalled();

    vi.stubGlobal("Notification", { permission: "denied", requestPermission });
    requestNotificationPermission();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("shows a notification only once permission is granted", () => {
    const NotificationCtor = vi.fn();
    Object.assign(NotificationCtor, { permission: "denied" });
    vi.stubGlobal("Notification", NotificationCtor);
    notify("title", "body");
    expect(NotificationCtor).not.toHaveBeenCalled();

    Object.assign(NotificationCtor, { permission: "granted" });
    notify("title", "body");
    expect(NotificationCtor).toHaveBeenCalledWith("title", { body: "body" });
  });

  it("does not throw when the environment has no Notification support", () => {
    vi.stubGlobal("Notification", undefined);
    expect(() => requestNotificationPermission()).not.toThrow();
    expect(() => notify("title", "body")).not.toThrow();
  });
});
