import { describe, it, expect } from "vitest";
import { summarizeContentBlock } from "./claude-agent.ts";

describe("summarizeContentBlock", () => {
  it("returns text blocks verbatim", () => {
    expect(summarizeContentBlock({ type: "text", text: "hello" })).toBe("hello");
  });

  it("summarizes tool_use with name and input", () => {
    expect(
      summarizeContentBlock({ type: "tool_use", name: "Bash", input: { command: "ls" } }),
    ).toBe('Tool: Bash({"command":"ls"})');
  });

  it("summarizes a successful tool_result", () => {
    expect(summarizeContentBlock({ type: "tool_result", content: "ok" })).toBe(
      "Tool result: ok",
    );
  });

  it("flags an error tool_result", () => {
    expect(summarizeContentBlock({ type: "tool_result", content: "boom", is_error: true })).toBe(
      "Tool result (error): boom",
    );
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
