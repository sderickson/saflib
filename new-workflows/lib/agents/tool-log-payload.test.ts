import { describe, it, expect } from "vitest";
import { parseToolLogPayload } from "./tool-log-payload.ts";

describe("parseToolLogPayload", () => {
  it("parses a tool_use payload", () => {
    const content = JSON.stringify({
      kind: "tool_use",
      id: "toolu_1",
      name: "Bash",
      input: { command: "ls" },
    });
    expect(parseToolLogPayload(content)).toEqual({
      kind: "tool_use",
      id: "toolu_1",
      name: "Bash",
      input: { command: "ls" },
    });
  });

  it("parses a tool_result payload", () => {
    const content = JSON.stringify({
      kind: "tool_result",
      tool_use_id: "toolu_1",
      content: "output",
      is_error: false,
    });
    expect(parseToolLogPayload(content)).toEqual({
      kind: "tool_result",
      tool_use_id: "toolu_1",
      content: "output",
      is_error: false,
    });
  });

  it("returns undefined for plain text content", () => {
    expect(parseToolLogPayload("---------- AGENT ----------\nhello")).toBeUndefined();
  });

  it("returns undefined for JSON that isn't a tool payload", () => {
    expect(parseToolLogPayload(JSON.stringify({ kind: "something-else" }))).toBeUndefined();
    expect(parseToolLogPayload(JSON.stringify({ foo: "bar" }))).toBeUndefined();
  });

  it("returns undefined for malformed JSON that happens to start with {", () => {
    expect(parseToolLogPayload("{not valid json")).toBeUndefined();
  });
});
