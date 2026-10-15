import { describe, it, expect } from "vitest";
import {
  buildSidebarItems,
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
          seq: 1,
          run_id: "r",
          step_index: 0,
          channel: "tool",
          level: "error",
          content: "boom",
          created_at: "",
          source_run_id: null,
          source_step_index: null,
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

  it("puts each direct message after the step it was sent during, in send order", () => {
    const steps = [
      { index: 0, kind: "cd" },
      { index: 1, kind: "prompt" },
      { index: 2, kind: "command" },
    ];
    const msg = (seq: number, step_index: number | null) => ({
      seq,
      step_index,
      content: `m${seq}`,
      created_at: "",
    });
    const items = buildSidebarItems(steps, [msg(30, 1), msg(10, 0), msg(20, 1), msg(40, 3)]);
    expect(items.map((i) => (i.type === "step" ? `s${i.step.index}` : `m${i.message.seq}`))).toEqual(
      ["s0", "m10", "s1", "m20", "m30", "s2", "m40"],
    );
  });
});
