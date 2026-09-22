import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Command } from "commander";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import {
  HelloWorkflowDefinition,
  defineWorkflow,
  step,
  runCopyStep,
  type CopyStepInput,
} from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { addValidateCommand } from "./validate.ts";

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

describe("validate CLI command", () => {
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
    repoRoot = mkdtempSync(path.join(tmpdir(), "saflib-validate-cli-"));
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

  it("exits 0 and prints OK when mechanical steps succeed", async () => {
    const program = new Command();
    const ctx: CliContext = { program, registry: [HelloWorkflowDefinition], dbKey };
    addValidateCommand(ctx);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync([
      "node",
      "new-workflow",
      "validate",
      "example/hello",
      "--name=widget",
    ]);

    expect(process.exitCode).toBeUndefined();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("OK");
    expect(output).toContain("no mechanical failures");
    // Validate must not dump the file tree.
    expect(output).not.toContain("+ widget.ts");

    logSpy.mockRestore();
  });

  it("exits non-zero and prints the area-mismatch reason", async () => {
    const targetDir = path.join(repoRoot, "packages/widget");
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(
      path.join(targetDir, "schema.ts"),
      [
        "// BEGIN SORTED WORKFLOW AREA schema-exports FOR test/area-mismatch",
        'export * from "./existing.ts";',
        "// END WORKFLOW AREA",
        "",
      ].join("\n"),
    );
    git(repoRoot, ["add", "-A"]);
    git(repoRoot, ["commit", "-m", "schema with sorted area"]);

    const templateDir = path.join(repoRoot, "templates");
    mkdirSync(templateDir, { recursive: true });
    const templateSchema = path.join(templateDir, "schema.ts");
    writeFileSync(
      templateSchema,
      [
        "// BEGIN WORKFLOW AREA schema-exports FOR test/area-mismatch",
        'export * from "./template-file.ts";',
        "// END WORKFLOW AREA",
        "",
      ].join("\n"),
    );

    type Ctx = { cwd: string };
    const MismatchWorkflow = defineWorkflow<Record<string, never>, Ctx>({
      id: "test/area-mismatch",
      description: "test",
      context: ({ cwd }) => ({ cwd }),
      steps: [
        step<CopyStepInput, Ctx>("copy", runCopyStep, () => ({
          templateFiles: { schemaIndex: templateSchema },
          targetDir,
        })),
      ],
    });

    const program = new Command();
    const ctx: CliContext = { program, registry: [MismatchWorkflow], dbKey };
    addValidateCommand(ctx);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync(["node", "new-workflow", "validate", "test/area-mismatch"]);

    expect(process.exitCode).toBe(1);
    const output = errorSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Validate failed");
    expect(output).toContain('Source has workflow area "schema-exports"');

    errorSpy.mockRestore();
  });
});
