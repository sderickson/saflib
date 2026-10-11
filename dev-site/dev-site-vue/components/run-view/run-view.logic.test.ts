import { describe, it, expect } from "vitest";
import {
  displayStepNumber,
  flattenStepTree,
  stepStatusClassNames,
  isNearScrollBottom,
  resolveFailureMessage,
  shouldShowPreviewPane,
  volumeIconName,
} from "./run-view.logic.ts";

describe("run-view.logic", () => {
  it("maps 0-based step_index to 1-based labels", () => {
    expect(displayStepNumber(0)).toBe(1);
    expect(displayStepNumber(6)).toBe(7);
  });

  it("flattens nested step trees", () => {
    const flat = flattenStepTree([
      {
        path: "0",
        kind: "cd",
        isCurrent: false,
        children: [{ path: "0/1", kind: "prompt", isCurrent: true, runId: "r1" }],
      },
    ]);
    expect(flat.map((n) => n.path)).toEqual(["0", "0/1"]);
    expect(flat[1].depth).toBe(1);
  });

  it("marks done, running, and viewport-active steps", () => {
    expect(stepStatusClassNames(0, 2, 1)["run-view__sidebar-step--done"]).toBe(true);
    expect(stepStatusClassNames(2, 2, 1)["run-view__sidebar-step--running"]).toBe(true);
    expect(stepStatusClassNames(1, 2, 1)["run-view__sidebar-step--active"]).toBe(true);
  });

  it("detects near-bottom scroll", () => {
    const el = {
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 768,
    } as HTMLElement;
    expect(isNearScrollBottom(el, 32)).toBe(true);
    expect(isNearScrollBottom({ ...el, scrollTop: 100 } as HTMLElement, 32)).toBe(false);
  });

  it("resolves failure messages from advance text or logs", () => {
    expect(resolveFailureMessage("nope", [])).toBe("nope");
    expect(
      resolveFailureMessage(undefined, [
        {
          id: "1",
          run_id: "r",
          step_index: 0,
          channel: "tool",
          level: "error",
          content: "boom",
          created_at: "",
        },
      ]),
    ).toBe("boom");
  });

  it("gates preview pane visibility", () => {
    expect(shouldShowPreviewPane(undefined, undefined, false, false)).toBe(true);
    expect(shouldShowPreviewPane("r1", "pending", true, false)).toBe(true);
    expect(shouldShowPreviewPane("r1", "pending", true, true)).toBe(false);
    expect(shouldShowPreviewPane("r1", "running", true, false)).toBe(false);
  });

  it("picks volume icons", () => {
    expect(volumeIconName(true, 0.8)).toBe("mdi-volume-off");
    expect(volumeIconName(false, 0.2)).toBe("mdi-volume-medium");
    expect(volumeIconName(false, 0.9)).toBe("mdi-volume-high");
  });
});
