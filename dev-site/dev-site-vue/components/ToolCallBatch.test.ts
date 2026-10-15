import { describe, it, expect } from "vitest";
import { mountWithPlugins } from "@saflib/vue/testing";
import ToolCallBatch from "./ToolCallBatch.vue";
import { groupLogs, type ToolBatch } from "../group-logs.ts";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

let n = 0;
function logFixture(content: object): WorkflowLogEntry {
  n++;
  return {
    id: `l${n}`,
    seq: n,
    run_id: "run-1",
    step_index: 0,
    channel: "agent",
    level: "info",
    content: JSON.stringify(content),
    created_at: "2026-09-15T00:00:00.000Z",
    source_run_id: null,
    source_step_index: null,
  };
}

function batchOf(logs: WorkflowLogEntry[]): ToolBatch {
  const item = groupLogs(logs)[0]!;
  if (item.type !== "tool-batch") throw new Error("expected a batch");
  return item;
}

describe("ToolCallBatch", () => {
  it("summarizes the calls, lists one line each, and opens a call's full card on click", async () => {
    const batch = batchOf([
      logFixture({ kind: "tool_use", id: "a", name: "Read", input: { file_path: "/repo/daemon/a.ts" } }),
      logFixture({ kind: "tool_result", tool_use_id: "a", content: "file body", is_error: false }),
      logFixture({ kind: "tool_use", id: "b", name: "Grep", input: { pattern: "needle" } }),
    ]);
    const wrapper = mountWithPlugins(ToolCallBatch, { props: { calls: batch.calls } });

    expect(wrapper.text()).toContain("Explored: 1 file read, 1 search");
    expect(wrapper.text()).toContain("daemon/a.ts");
    expect(wrapper.text()).not.toContain("/repo/");
    // The grep has no result yet.
    expect(wrapper.text()).toContain("running…");
    expect(wrapper.text()).not.toContain("file body");

    await wrapper.findAll(".tool-call-batch__row")[0]!.trigger("click");
    expect(wrapper.text()).toContain("file body");
  });
});
