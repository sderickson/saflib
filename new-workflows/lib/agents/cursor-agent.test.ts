import { describe, it, expect } from "vitest";
import { createCursorToolCallTracker } from "./cursor-agent.ts";

const started = (call: object, call_id?: string) => ({
  type: "tool_call",
  subtype: "started",
  ...(call_id ? { call_id } : {}),
  tool_call: call,
});
const completed = (call: object, call_id?: string) => ({
  type: "tool_call",
  subtype: "completed",
  ...(call_id ? { call_id } : {}),
  tool_call: call,
});

describe("createCursorToolCallTracker", () => {
  it("turns a shell call's start and finish into one claude-style Bash pair", () => {
    const tracker = createCursorToolCallTracker();
    expect(
      tracker.toPayload(started({ shellToolCall: { args: { command: "npm test" } } }, "c1")),
    ).toEqual({ kind: "tool_use", id: "c1", name: "Bash", input: { command: "npm test" } });
    expect(
      tracker.toPayload(
        completed(
          {
            shellToolCall: {
              args: { command: "npm test" },
              result: { success: { stdout: "ok\n", stderr: "", exitCode: 0 } },
            },
          },
          "c1",
        ),
      ),
    ).toEqual({ kind: "tool_result", tool_use_id: "c1", content: "ok\n", is_error: false });
  });

  it("marks a failed command as an error and keeps its output", () => {
    const tracker = createCursorToolCallTracker();
    tracker.toPayload(started({ shellToolCall: { args: { command: "false" } } }, "c1"));
    expect(
      tracker.toPayload(
        completed(
          { shellToolCall: { result: { failure: { stdout: "", stderr: "boom", exitCode: 1 } } } },
          "c1",
        ),
      ),
    ).toEqual({ kind: "tool_result", tool_use_id: "c1", content: "boom\nexit code 1", is_error: true });
  });

  it("pairs completions with the oldest open call of the same tool when there's no call_id", () => {
    const tracker = createCursorToolCallTracker();
    const a = tracker.toPayload(started({ readToolCall: { args: { path: "/repo/a.ts" } } }));
    const b = tracker.toPayload(started({ editToolCall: { args: { path: "/repo/b.ts" } } }));
    expect(a).toMatchObject({ name: "Read", input: { file_path: "/repo/a.ts" } });
    expect(b).toMatchObject({ name: "Edit", input: { file_path: "/repo/b.ts" } });
    const doneB = tracker.toPayload(completed({ editToolCall: { result: { success: {} } } }));
    const doneA = tracker.toPayload(
      completed({ readToolCall: { result: { success: { content: "file text" } } } }),
    );
    expect(doneB).toMatchObject({ tool_use_id: (b as { id: string }).id });
    expect(doneA).toMatchObject({ tool_use_id: (a as { id: string }).id, content: "file text" });
  });

  it("maps todos to TodoWrite and unknown tools to their bare name", () => {
    const tracker = createCursorToolCallTracker();
    expect(
      tracker.toPayload(
        started({ updateTodosToolCall: { args: { todos: [{ content: "x", status: "pending" }] } } }),
      ),
    ).toMatchObject({ name: "TodoWrite", input: { todos: [{ content: "x", status: "pending" }] } });
    expect(
      tracker.toPayload(started({ webSearchToolCall: { args: { query: "q" } } })),
    ).toMatchObject({ name: "webSearch", input: { query: "q" } });
  });

  it("finds the tool's key among cursor's bookkeeping keys, and hides getMcpTools", () => {
    const tracker = createCursorToolCallTracker();
    expect(
      tracker.toPayload(
        started(
          {
            toolCallId: "x",
            startedAtMs: "1",
            hookAdditionalContexts: [],
            shellToolCall: { args: { command: "ls" } },
          },
          "c1",
        ),
      ),
    ).toMatchObject({ name: "Bash", input: { command: "ls" } });
    expect(
      tracker.toPayload(started({ getMcpToolsToolCall: { args: { toolName: "Task" } } }, "c2")),
    ).toBeUndefined();
  });

  it("lists grep matches as file:line: text, relative to the searched root", () => {
    const tracker = createCursorToolCallTracker();
    tracker.toPayload(started({ grepToolCall: { args: { pattern: "x" } } }, "g"));
    const result = tracker.toPayload(
      completed(
        {
          grepToolCall: {
            result: {
              success: {
                workspaceResults: {
                  "/repo/daemon/service/sdk": {
                    content: {
                      matches: [
                        { file: "../../plans/a.md", matches: [{ lineNumber: 8, content: "the x" }] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        "g",
      ),
    );
    expect(result).toMatchObject({ content: "/repo/daemon/plans/a.md:8: the x", is_error: false });
  });
});
