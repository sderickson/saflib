import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  unlockAudio,
  playSuccessBell,
  playFailureQuack,
  requestNotificationPermission,
  notify,
  __resetAudioContextForTests,
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
    __resetAudioContextForTests();
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
