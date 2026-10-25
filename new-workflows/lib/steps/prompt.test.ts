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

  it("succeeds on resume in print mode, without re-emitting the prompt", async () => {
    const { ctx, chunks } = makeTestContext({ mode: "print", isResume: true });
    const result = await runPromptStep({ prompt: "do something" }, ctx);
    expect(result).toEqual({ status: "success" });
    expect(chunks).toEqual([]);
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

  it("lists the step's expected files after the prompt", async () => {
    const { ctx } = makeTestContext({ mode: "print", originalWorkingDirectory: "/repo" });
    const result = await runPromptStep(
      { prompt: "do something", files: ["app/spec/**", "app/spec/openapi.yaml"] },
      ctx,
    );
    expect(result).toEqual({
      status: "awaiting_prompt",
      prompt: expect.stringContaining(
        "do something\n\nFiles this step is expected to change (relative to /repo):\n- app/spec/**\n- app/spec/openapi.yaml",
      ),
    });
  });
});
