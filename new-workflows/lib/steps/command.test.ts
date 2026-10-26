import { describe, it, expect, assert } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

  it("forces color/interactivity off for the spawned process, so tool output (e.g. vitest) doesn't emit cursor-control escape codes", async () => {
    // Regression: a workflow step's `command`/`npm-script` output is
    // captured via a pipe and persisted as a plain-text log line, never a
    // real TTY a tool could render interactively into — but an inherited
    // `FORCE_COLOR` from the parent process defeats most tools' own
    // non-TTY auto-detection, producing garbled ANSI escape sequences
    // wherever that log later gets displayed.
    const { ctx, chunks } = makeTestContext({ mode: "run" });
    const result = await runCommandStep(
      {
        command: "node",
        args: ["-e", "console.log(JSON.stringify({ci: process.env.CI, forceColor: process.env.FORCE_COLOR, noColor: process.env.NO_COLOR}))"],
      },
      ctx,
    );
    expect(result.status).toBe("success");
    const output = chunks
      .filter((c) => c.channel === "terminal")
      .map((c) => c.content)
      .join("");
    expect(JSON.parse(output)).toEqual({ ci: "true", forceColor: "0", noColor: "1" });
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

  it("fails without running when npm run names a script the package doesn't have, even in script mode", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "command-step-"));
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ scripts: { typecheck: "tsc" } }));
    const { ctx, chunks } = makeTestContext({ mode: "script", cwd: dir });

    const result = await runCommandStep({ command: "npm", args: ["run", "test"] }, ctx);

    expect(result).toEqual({
      status: "error",
      message: expect.stringContaining('There is no "test" script'),
    });
    expect(chunks.some((c) => c.content.includes("Running command"))).toBe(false);
  });

  it("tells the agent to fix only what the run broke, within the run's expected files", async () => {
    const { ctx } = makeTestContext({
      mode: "print",
      originalWorkingDirectory: "/repo",
      expectedFiles: ["app/spec/**"],
    });

    const result = await runCommandStep({ command: "node", args: ["-e", "process.exit(1)"] }, ctx);

    assert(result.status === "awaiting_prompt");
    expect(result.prompt).toContain("Fix only failures this run's changes caused.");
    expect(result.prompt).toContain("- app/spec/**");
  });
});
