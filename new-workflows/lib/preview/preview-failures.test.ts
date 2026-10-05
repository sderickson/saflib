import { describe, it, expect } from "vitest";
import {
  isExpectedPreviewSkip,
  isMechanicalPreviewFailure,
} from "./preview-failures.ts";
import type { PreviewStepEntry } from "./preview-run.ts";

function entry(overrides: Partial<PreviewStepEntry> & Pick<PreviewStepEntry, "kind" | "applied">): PreviewStepEntry {
  return {
    workflowId: "test/w",
    stepIndex: 0,
    ...overrides,
  };
}

describe("isExpectedPreviewSkip / isMechanicalPreviewFailure", () => {
  it("treats prompt/command/update as expected skips", () => {
    for (const kind of ["prompt", "command", "update", "npm-script"]) {
      const e = entry({ kind, applied: false, reason: "needs a real run" });
      expect(isExpectedPreviewSkip(e)).toBe(true);
      expect(isMechanicalPreviewFailure(e)).toBe(false);
    }
  });

  it("treats stepSkipIf as an expected skip even for copy", () => {
    const e = entry({ kind: "copy", applied: false, reason: "skipped (stepSkipIf)" });
    expect(isExpectedPreviewSkip(e)).toBe(true);
    expect(isMechanicalPreviewFailure(e)).toBe(false);
  });

  it("treats failed copy/transform-file/cd as mechanical failures", () => {
    for (const kind of ["copy", "transform-file", "cd"]) {
      const e = entry({
        kind,
        applied: false,
        reason: 'Source has workflow area "fake-handler-imports"',
      });
      expect(isExpectedPreviewSkip(e)).toBe(false);
      expect(isMechanicalPreviewFailure(e)).toBe(true);
    }
  });

  it("does not flag applied steps as failures", () => {
    const e = entry({ kind: "copy", applied: true, files: [] });
    expect(isMechanicalPreviewFailure(e)).toBe(false);
  });
});
