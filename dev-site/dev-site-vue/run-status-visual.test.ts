import { describe, it, expect } from "vitest";
import { runStatusVisual } from "./run-status-visual.ts";

function run(overrides: Partial<{ status: string; is_advancing: boolean; was_cancelled: boolean }> = {}) {
  return { status: "pending", is_advancing: false, was_cancelled: false, ...overrides };
}

describe("runStatusVisual", () => {
  it("shows a spinner whenever is_advancing is true, regardless of status", () => {
    expect(runStatusVisual(run({ status: "failed", is_advancing: true }))).toEqual({
      label: "running",
      spinner: true,
      color: "info",
    });
  });

  it("shows a light-blue pause icon for a cancelled (not a genuine failure) run", () => {
    expect(runStatusVisual(run({ status: "failed", was_cancelled: true }))).toEqual({
      label: "paused",
      spinner: false,
      icon: "mdi-pause-circle",
      color: "light-blue",
    });
  });

  it("prefers the spinner over the paused icon if somehow both are true", () => {
    expect(
      runStatusVisual(run({ status: "failed", is_advancing: true, was_cancelled: true })),
    ).toEqual({ label: "running", spinner: true, color: "info" });
  });

  it("shows a green check for done", () => {
    expect(runStatusVisual(run({ status: "done" }))).toEqual({
      label: "done",
      spinner: false,
      icon: "mdi-check-circle",
      color: "success",
    });
  });

  it("shows a red x for a genuine failure", () => {
    expect(runStatusVisual(run({ status: "failed" }))).toEqual({
      label: "failed",
      spinner: false,
      icon: "mdi-close-circle",
      color: "error",
    });
  });

  it("shows an amber pause for awaiting_prompt/awaiting_user", () => {
    expect(runStatusVisual(run({ status: "awaiting_prompt" }))).toEqual({
      label: "awaiting_prompt",
      spinner: false,
      icon: "mdi-pause-circle",
      color: "warning",
    });
    expect(runStatusVisual(run({ status: "awaiting_user" }))).toEqual({
      label: "awaiting_user",
      spinner: false,
      icon: "mdi-pause-circle",
      color: "warning",
    });
  });

  it("falls back to a progress-clock icon for pending/running", () => {
    expect(runStatusVisual(run({ status: "pending" }))).toEqual({
      label: "pending",
      spinner: false,
      icon: "mdi-progress-clock",
      color: "info",
    });
  });

  it("shows a neutral ellipsis when there's no run at all", () => {
    expect(runStatusVisual(undefined)).toEqual({ label: "…", spinner: false });
  });
});
