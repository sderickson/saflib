import { describe, it, expect, vi, afterEach } from "vitest";
import {
  summarizeContentBlock,
  parseResultMetrics,
  formatResultSummary,
} from "./claude-agent.ts";
import { killProcessGroup } from "./registry.ts";

describe("summarizeContentBlock", () => {
  it("returns text blocks verbatim", () => {
    expect(summarizeContentBlock({ type: "text", text: "hello" })).toBe("hello");
  });

  it("returns the thinking text when present", () => {
    expect(summarizeContentBlock({ type: "thinking", thinking: "considering options" })).toBe(
      "considering options",
    );
  });

  it("shows a placeholder instead of dumping the signature when thinking text is empty", () => {
    // Real payloads carry a multi-KB base64 `signature` alongside an empty
    // `thinking` string — falling through to JSON.stringify(block) here
    // used to dump that whole blob into the log.
    const block = { type: "thinking", thinking: "", signature: "Et8ECqgB...verylongblob" };
    expect(summarizeContentBlock(block)).toBe("(thinking…)");
  });

  it("falls back to JSON for unknown block types", () => {
    expect(summarizeContentBlock({ type: "mystery", foo: 1 })).toBe('{"type":"mystery","foo":1}');
  });
});

describe("killProcessGroup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when no pid is given", () => {
    const spy = vi.spyOn(process, "kill");
    killProcessGroup(undefined, "SIGTERM");
    expect(spy).not.toHaveBeenCalled();
  });

  it("signals the whole process group via the negative pid", () => {
    const spy = vi.spyOn(process, "kill").mockImplementation(() => true);
    killProcessGroup(123, "SIGTERM");
    expect(spy).toHaveBeenCalledWith(-123, "SIGTERM");
  });

  it("falls back to signaling just the pid if the group kill throws", () => {
    const spy = vi
      .spyOn(process, "kill")
      .mockImplementationOnce(() => {
        throw new Error("ESRCH");
      })
      .mockImplementationOnce(() => true);
    killProcessGroup(123, "SIGKILL");
    expect(spy).toHaveBeenNthCalledWith(1, -123, "SIGKILL");
    expect(spy).toHaveBeenNthCalledWith(2, 123, "SIGKILL");
  });

  it("swallows the error if even the single-pid fallback fails (already exited)", () => {
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw new Error("ESRCH");
    });
    expect(() => killProcessGroup(123, "SIGKILL")).not.toThrow();
  });
});

describe("parseResultMetrics", () => {
  it("pulls timing, usage, and cost from a result event", () => {
    const metrics = parseResultMetrics({
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 90_000,
      duration_api_ms: 84_200,
      num_turns: 12,
      total_cost_usd: 0.42131,
      usage: {
        input_tokens: 40,
        output_tokens: 3_100,
        cache_read_input_tokens: 220_000,
        cache_creation_input_tokens: 18_000,
      },
    });
    expect(metrics).toEqual({
      resultSubtype: "success",
      isError: false,
      apiDurationMs: 84_200,
      numTurns: 12,
      inputTokens: 40,
      outputTokens: 3_100,
      cacheReadInputTokens: 220_000,
      cacheCreationInputTokens: 18_000,
      costUsd: 0.42131,
    });
    expect(formatResultSummary(metrics)).toBe(" · 12 turns · 84s API · $0.4213");
  });

  it("leaves missing fields undefined", () => {
    const metrics = parseResultMetrics({ type: "result", subtype: "error_max_turns", is_error: true });
    expect(metrics).toMatchObject({ resultSubtype: "error_max_turns", isError: true });
    expect(metrics.costUsd).toBeUndefined();
    expect(formatResultSummary(metrics)).toBe("");
  });
});
