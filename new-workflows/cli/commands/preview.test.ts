import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Command } from "commander";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { addPreviewCommand } from "./preview.ts";

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  }).trim();
}

/**
 * Invokes the `preview` command exactly as the real CLI does — through
 * commander's `parseAsync` against a fresh Command/CliContext each time —
 * rather than calling internal functions directly, so this also proves the
 * command is actually wired up (registered, arg-parsed) correctly.
 */
async function runPreviewCli(dbKey: DbKey, args: string[]): Promise<void> {
  const program = new Command();
  const ctx: CliContext = { program, registry: [HelloWorkflowDefinition], dbKey };
  addPreviewCommand(ctx);
  await program.parseAsync(["node", "new-workflow", "preview", ...args]);
}

describe("preview CLI command", () => {
  let dbKey: DbKey;
  let repoRoot: string;
  let originalCwd: string;
  let originalExitCode: typeof process.exitCode;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
    repoRoot = mkdtempSync(path.join(tmpdir(), "saflib-preview-cli-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);
    git(repoRoot, ["commit", "--allow-empty", "-m", "base"]);
    originalCwd = process.cwd();
    process.chdir(repoRoot);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.exitCode = originalExitCode;
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("prints the file it would add, exits 0, and leaves no scratch dirs behind", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const tmpBefore = readdirSync(tmpdir()).filter((f) => f.startsWith("saflib-preview-"));

    await runPreviewCli(dbKey, ["example/hello", "--name=widget"]);

    expect(process.exitCode).toBeUndefined();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("+ widget.ts");
    expect(output).toContain("step(s) need a real run to preview");

    const tmpAfter = readdirSync(tmpdir()).filter((f) => f.startsWith("saflib-preview-"));
    expect(tmpAfter).toEqual(tmpBefore);

    logSpy.mockRestore();
  });

  it("exits non-zero and prints the error for a genuine template failure, still leaving no scratch dirs behind", async () => {
    // A required `templateFiles` source that doesn't exist on disk makes
    // the real `runCopyStep` throw — the same class of "workflow area
    // error" a bad copy target produces mid-run.
    const BrokenWorkflow = {
      ...HelloWorkflowDefinition,
      id: "example/broken",
      steps: [
        {
          ...HelloWorkflowDefinition.steps[0],
          input: () => ({
            templateFiles: { file: path.join(repoRoot, "does-not-exist.ts") },
            targetDir: repoRoot,
            name: "widget",
          }),
        },
      ],
    };

    const program = new Command();
    const ctx: CliContext = { program, registry: [BrokenWorkflow as never], dbKey };
    addPreviewCommand(ctx);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tmpBefore = readdirSync(tmpdir()).filter((f) => f.startsWith("saflib-preview-"));

    await program.parseAsync(["node", "new-workflow", "preview", "example/broken"]);

    expect(process.exitCode).toBe(1);
    const output = errorSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Preview failed");
    expect(output).toContain("copy");

    const tmpAfter = readdirSync(tmpdir()).filter((f) => f.startsWith("saflib-preview-"));
    expect(tmpAfter).toEqual(tmpBefore);

    errorSpy.mockRestore();
  });
});
