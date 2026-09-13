import { describe, it, expect } from "vitest";
import { runCommandStep } from "./command.ts";
import { makeTestContext } from "../test-helpers.ts";

describe("runCommandStep", () => {
  it("skips entirely in dry mode", async () => {
    const { ctx } = makeTestContext({ mode: "dry" });
    const result = await runCommandStep({ command: "false", args: [] }, ctx);
    expect(result.status).toBe("success");
  });

  it("skips validation commands in script mode without running them", async () => {
    const { ctx, chunks } = makeTestContext({ mode: "script" });
    const result = await runCommandStep(
      { command: "npm", args: ["run", "typecheck"] },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(chunks.some((c) => c.content.includes("Skipped validation command"))).toBe(true);
  });

  it("runs a real command and captures terminal output (mode: run)", async () => {
    const { ctx, chunks } = makeTestContext({ mode: "run" });
    const result = await runCommandStep(
      { command: "node", args: ["-e", "console.log('hi')"] },
      ctx,
    );
    expect(result.status).toBe("success");
    expect(chunks.some((c) => c.channel === "terminal" && c.content.includes("hi"))).toBe(true);
  });

  it("hard-fails immediately on failure in script mode (no retry)", async () => {
    const { ctx } = makeTestContext({ mode: "script" });
    const result = await runCommandStep({ command: "node", args: ["-e", "process.exit(1)"] }, ctx);
    expect(result.status).toBe("error");
  });

  it("errors after exhausting retries in run mode with a mock agent", async () => {
    const { ctx } = makeTestContext({
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });
    const result = await runCommandStep({ command: "node", args: ["-e", "process.exit(1)"] }, ctx);
    expect(result.status).toBe("error");
  });

  it("ignores errors when ignoreError is set", async () => {
    const { ctx } = makeTestContext({ mode: "script" });
    const result = await runCommandStep(
      { command: "node", args: ["-e", "process.exit(1)"], ignoreError: true },
      ctx,
    );
    expect(result.status).toBe("success");
  });
});
