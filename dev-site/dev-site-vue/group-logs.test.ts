import { describe, it, expect } from "vitest";
import { groupLogs, shortenRepoPaths } from "./group-logs.ts";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

function logFixture(overrides: Partial<WorkflowLogEntry> = {}): WorkflowLogEntry {
  return {
    id: `l${Math.random()}`,
    seq: 1,
    run_id: "run-1",
    step_index: 0,
    channel: "agent",
    level: "info",
    content: "plain text",
    created_at: "2026-09-15T00:00:00.000Z",
    source_run_id: null,
    source_step_index: null,
    ...overrides,
  };
}

describe("groupLogs", () => {
  it("pairs a tool_use with its later tool_result", () => {
    const useLog = logFixture({
      id: "l1",
      content: JSON.stringify({ kind: "tool_use", id: "toolu_1", name: "Bash", input: { command: "ls" } }),
    });
    const resultLog = logFixture({
      id: "l2",
      content: JSON.stringify({ kind: "tool_result", tool_use_id: "toolu_1", content: "a\nb", is_error: false }),
    });

    const items = groupLogs([useLog, resultLog]);

    expect(items).toEqual([
      {
        type: "tool-call",
        id: "toolu_1",
        name: "Bash",
        input: { command: "ls" },
        useLog,
        resultLog,
      },
    ]);
  });

  it("keeps a tool_use without a result yet as an open group", () => {
    const useLog = logFixture({
      content: JSON.stringify({ kind: "tool_use", id: "toolu_1", name: "Bash", input: { command: "ls" } }),
    });

    const items = groupLogs([useLog]);

    expect(items).toEqual([
      { type: "tool-call", id: "toolu_1", name: "Bash", input: { command: "ls" }, useLog },
    ]);
  });

  it("leaves plain text and unrelated entries as standalone items, in order", () => {
    const textLog = logFixture({ content: "---------- AGENT ----------\nhello" });
    const terminalLog = logFixture({ channel: "terminal", content: "npm output" });

    const items = groupLogs([textLog, terminalLog]);

    expect(items).toEqual([
      { type: "single", log: textLog },
      { type: "single", log: terminalLog },
    ]);
  });

  it("falls back to standalone for a tool_result with no matching tool_use", () => {
    const orphanResult = logFixture({
      content: JSON.stringify({ kind: "tool_result", tool_use_id: "toolu_missing", content: "x", is_error: false }),
    });

    const items = groupLogs([orphanResult]);

    expect(items).toEqual([{ type: "single", log: orphanResult }]);
  });

  it("merges 2+ consecutive same-channel entries into one channel-group", () => {
    const a = logFixture({ id: "a", channel: "tool", content: "Running command: npm run typecheck" });
    const b = logFixture({ id: "b", channel: "tool", content: "Successfully ran `npm run typecheck`" });
    const c = logFixture({ id: "c", channel: "tool", content: "Committed: drizzle/update-schema: update" });

    const items = groupLogs([a, b, c]);

    expect(items).toEqual([
      { type: "channel-group", id: "group-a", channel: "tool", logs: [a, b, c] },
    ]);
  });

  it("leaves a lone entry as a single item, even with the merge pass applied", () => {
    const a = logFixture({ id: "a", channel: "tool", content: "cd into test-product/service/db" });
    const b = logFixture({ id: "b", channel: "agent", content: "---------- AGENT ----------\nhi" });

    const items = groupLogs([a, b]);

    expect(items).toEqual([
      { type: "single", log: a },
      { type: "single", log: b },
    ]);
  });

  it("breaks a channel-group at a channel change, then starts a new one", () => {
    const a = logFixture({ id: "a", channel: "tool", content: "one" });
    const b = logFixture({ id: "b", channel: "tool", content: "two" });
    const c = logFixture({ id: "c", channel: "terminal", content: "npm output" });
    const d = logFixture({ id: "d", channel: "tool", content: "three" });
    const e = logFixture({ id: "e", channel: "tool", content: "four" });

    const items = groupLogs([a, b, c, d, e]);

    expect(items).toEqual([
      { type: "channel-group", id: "group-a", channel: "tool", logs: [a, b] },
      { type: "single", log: c },
      { type: "channel-group", id: "group-d", channel: "tool", logs: [d, e] },
    ]);
  });

  it("does not merge a channel-group across an intervening tool-call", () => {
    const a = logFixture({ id: "a", channel: "tool", content: "one" });
    const b = logFixture({ id: "b", channel: "tool", content: "two" });
    const useLog = logFixture({
      id: "u",
      channel: "agent",
      content: JSON.stringify({ kind: "tool_use", id: "toolu_1", name: "Bash", input: { command: "ls" } }),
    });
    const c = logFixture({ id: "c", channel: "tool", content: "three" });
    const d = logFixture({ id: "d", channel: "tool", content: "four" });

    const items = groupLogs([a, b, useLog, c, d]);

    expect(items).toEqual([
      { type: "channel-group", id: "group-a", channel: "tool", logs: [a, b] },
      { type: "tool-call", id: "toolu_1", name: "Bash", input: { command: "ls" }, useLog },
      { type: "channel-group", id: "group-c", channel: "tool", logs: [c, d] },
    ]);
  });

  it("interleaves standalone entries and tool calls in their original order", () => {
    const text1 = logFixture({ content: "---------- AGENT ----------\nfirst" });
    const useLog = logFixture({
      content: JSON.stringify({ kind: "tool_use", id: "toolu_1", name: "Bash", input: { command: "ls" } }),
    });
    const resultLog = logFixture({
      content: JSON.stringify({ kind: "tool_result", tool_use_id: "toolu_1", content: "out", is_error: false }),
    });
    const text2 = logFixture({ content: "---------- AGENT ----------\nsecond" });

    const items = groupLogs([text1, useLog, resultLog, text2]);

    expect(items.map((i) => i.type)).toEqual(["single", "tool-call", "single"]);
  });

  const use = (id: string, name: string, input: object) =>
    logFixture({ id: `use-${id}`, content: JSON.stringify({ kind: "tool_use", id, name, input }) });
  const result = (id: string, content = "ok") =>
    logFixture({
      id: `res-${id}`,
      content: JSON.stringify({ kind: "tool_result", tool_use_id: id, content, is_error: false }),
    });

  it("batches back-to-back reads and searches into one item, keyed by the first call", () => {
    const items = groupLogs([
      use("a", "Read", { file_path: "/repo/a.ts" }),
      use("b", "Grep", { pattern: "foo" }),
      result("a"),
      result("b"),
      use("c", "Bash", { command: "npm test" }),
      result("c"),
      use("d", "Read", { file_path: "/repo/d.ts" }),
    ]);

    expect(items.map((i) => i.type)).toEqual(["tool-batch", "tool-call", "tool-call"]);
    const batch = items[0]!;
    expect(batch.type === "tool-batch" && batch.id).toBe("batch-a");
    expect(batch.type === "tool-batch" && batch.calls.map((c) => c.resultLog?.id)).toEqual([
      "res-a",
      "res-b",
    ]);
  });

  it("shows paths relative to the repo root, inside tool payloads too", () => {
    const items = groupLogs([use("a", "Bash", { command: "cd /repo/daemon && ls /repo" })]);
    expect(items[0]!.type === "tool-call" && items[0]!.input).toEqual({ command: "cd daemon && ls ." });
  });
});

describe("shortenRepoPaths", () => {
  it("only rewrites the repo root, not lookalikes", () => {
    expect(shortenRepoPaths("Writing file: /repo/daemon/x.ts")).toBe("Writing file: daemon/x.ts");
    expect(shortenRepoPaths("/srv/repo/x /repository /repo.ts")).toBe("/srv/repo/x /repository /repo.ts");
  });
});
