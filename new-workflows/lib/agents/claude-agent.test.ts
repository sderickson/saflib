import { describe, it, expect, vi, afterEach } from "vitest";
import { summarizeContentBlock, killProcessGroup } from "./claude-agent.ts";

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
