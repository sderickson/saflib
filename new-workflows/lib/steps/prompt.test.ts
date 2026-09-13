import { describe, it, expect } from "vitest";
import { runPromptStep } from "./prompt.ts";
import { makeTestContext } from "../test-helpers.ts";

describe("runPromptStep", () => {
  it("skips entirely in dry/checklist/script modes", async () => {
    for (const mode of ["dry", "checklist", "script"] as const) {
      const { ctx, chunks } = makeTestContext({ mode });
      const result = await runPromptStep({ prompt: "do something" }, ctx);
      expect(result.status).toBe("success");
      expect(chunks).toEqual([]);
    }
  });

  it("hands off to the caller in print mode", async () => {
    const { ctx, chunks } = makeTestContext({ mode: "print" });
    const result = await runPromptStep({ prompt: "do something" }, ctx);
    expect(result).toEqual({ status: "awaiting_prompt", prompt: "do something" });
    expect(chunks[0]).toEqual({
      channel: "agent-input",
      level: "info",
      content: "do something",
    });
  });

  it("runs the agent and succeeds in run mode with a mock agent", async () => {
    const { ctx, chunks } = makeTestContext({
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });
    const result = await runPromptStep({ prompt: "do something" }, ctx);
    expect(result.status).toBe("success");
    expect(chunks.some((c) => c.channel === "agent")).toBe(true);
  });
});
