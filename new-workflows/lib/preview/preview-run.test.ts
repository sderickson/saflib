import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { listTree, readBlob } from "@saflib/git";
import { defineWorkflow, step } from "../engine.ts";
import { runCopyStep, type CopyStepInput } from "../steps/copy/copy-step.ts";
import { runTransformFileStep, type TransformFileStepInput } from "../steps/transform-file.ts";
import { runCdStep, type CdStepInput } from "../steps/cd.ts";
import { runCommandStep, type CommandStepInput } from "../steps/command.ts";
import { previewRun } from "./preview-run.ts";

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

interface Ctx {
  cwd: string;
}

describe("previewRun", () => {
  let dbKey: DbKey;
  let repoRoot: string;
  let baseHash: string;
  let templateDir: string;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();

    repoRoot = mkdtempSync(path.join(tmpdir(), "saflib-preview-repo-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);

    mkdirSync(path.join(repoRoot, "packages/widget"), { recursive: true });
    writeFileSync(
      path.join(repoRoot, "packages/widget/package.json"),
      JSON.stringify({ name: "@test/widget", private: true }, null, 2) + "\n",
    );
    writeFileSync(path.join(repoRoot, "packages/widget/existing.ts"), "export const x = 1;\n");
    git(repoRoot, ["add", "-A"]);
    git(repoRoot, ["commit", "-m", "base"]);
    baseHash = git(repoRoot, ["rev-parse", "HEAD"]);

    templateDir = mkdtempSync(path.join(tmpdir(), "saflib-preview-templates-"));
    writeFileSync(path.join(templateDir, "template-file.ts"), "export const templateFile = true;\n");
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
    rmSync(repoRoot, { recursive: true, force: true });
    rmSync(templateDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
  });

  const CopyOnlyWorkflow = defineWorkflow<Record<string, never>, Ctx>({
    id: "test/preview-copy",
    description: "test",
    context: ({ cwd }) => ({ cwd }),
    steps: [
      step<CopyStepInput, Ctx>("copy", runCopyStep, ({ context }) => ({
        templateFiles: { file: path.join(templateDir, "template-file.ts") },
        targetDir: context.cwd,
        name: "widget",
      })),
    ],
  });

  const RootWorkflow = defineWorkflow<Record<string, never>, Ctx>({
    id: "test/preview-root",
    description: "test",
    context: ({ cwd }) => ({ cwd }),
    steps: [
      step<CdStepInput, Ctx>("cd", runCdStep, () => ({ path: "packages/widget" })),
      step<CommandStepInput, Ctx>("command", runCommandStep, () => ({
        command: "npm",
        args: ["--version"],
      })),
      step<import("../steps/call-workflow.ts").CallWorkflowStepInput, Ctx>(
        "call-workflow",
        // Not actually invoked by previewRun — only its `input()` builder
        // (below) matters, so the real `runCallWorkflowStep` fn is fine as
        // a placeholder to satisfy the type.
        (async () => ({ status: "success" })) as never,
        () => ({
          targetDefinition: CopyOnlyWorkflow as never,
          targetInput: {},
        }),
      ),
      step<TransformFileStepInput, Ctx>("transform-file", runTransformFileStep, ({ context }) => ({
        filePath: path.join(context.cwd, "existing.ts"),
        transform: (content) => content.replace("x = 1", "x = 2"),
      })),
    ],
  });

  it("applies cd/copy/transform-file, recurses into call-workflow, and skips command steps", async () => {
    const result = await previewRun(dbKey, RootWorkflow, {}, { repoRoot, baseHash, cwd: repoRoot });

    expect(result.baseHash).toBe(baseHash);
    expect(result.finalHash).not.toBe(baseHash);

    const kinds = result.entries.map((e) => ({ kind: e.kind, applied: e.applied }));
    expect(kinds).toEqual([
      { kind: "cd", applied: true },
      { kind: "command", applied: false },
      { kind: "call-workflow", applied: true },
      { kind: "copy", applied: true }, // nested, from CopyOnlyWorkflow
      { kind: "transform-file", applied: true },
    ]);
    expect(result.entries.find((e) => e.kind === "copy")?.workflowId).toBe("test/preview-copy");
    expect(result.entries.find((e) => e.kind === "command")?.reason).toBe("needs a real run");

    // Per-step file tracking: the copy step wrote a brand-new file; the
    // transform-file step edited a file that already existed at baseHash.
    expect(result.entries.find((e) => e.kind === "copy")?.files).toEqual([
      { path: "packages/widget/widget.ts", status: "added" },
    ]);
    expect(result.entries.find((e) => e.kind === "transform-file")?.files).toEqual([
      { path: "packages/widget/existing.ts", status: "modified" },
    ]);

    const tree = listTree(repoRoot, result.finalHash).result!;
    const byPath = Object.fromEntries(tree.map((e) => [e.path, e.blobHash]));

    // The copy step landed inside packages/widget (the `cd` target).
    const widgetFile = byPath["packages/widget/widget.ts"];
    expect(widgetFile).toBeDefined();
    expect(readBlob(repoRoot, widgetFile).result).toContain("widget = true");

    // The transform-file step updated the pre-existing file in place.
    const existing = byPath["packages/widget/existing.ts"];
    expect(readBlob(repoRoot, existing).result).toBe("export const x = 2;\n");

    // The real repo was never touched.
    expect(git(repoRoot, ["rev-parse", "HEAD"])).toBe(baseHash);
    expect(git(repoRoot, ["status", "--porcelain"])).toBe("");
  });

  it("marks cd as not applied when the target has no package.json", async () => {
    const BadCdWorkflow = defineWorkflow<Record<string, never>, Ctx>({
      id: "test/preview-bad-cd",
      description: "test",
      context: ({ cwd }) => ({ cwd }),
      steps: [
        step<CdStepInput, Ctx>("cd", runCdStep, () => ({ path: "packages" })),
      ],
    });

    const result = await previewRun(dbKey, BadCdWorkflow, {}, { repoRoot, baseHash, cwd: repoRoot });
    expect(result.entries).toEqual([
      {
        workflowId: "test/preview-bad-cd",
        stepIndex: 0,
        kind: "cd",
        applied: false,
        reason: expect.stringContaining("Package.json not found"),
      },
    ]);
  });
});
