import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";
import { runCopyStep, type CopyStepInput } from "./steps/copy/copy-step.ts";
import { runUpdateStep, type UpdateStepInput } from "./steps/update.ts";
import { runCdStep, type CdStepInput } from "./steps/cd.ts";
import { runCommandStep, type CommandStepInput } from "./steps/command.ts";
import type { WorkflowDefinition } from "./types.ts";

/**
 * Proof-of-concept port of `workflows/workflows/add-workflow.ts`'s step
 * shape onto the new engine: copy (from a directory template) -> update
 * (agent, TODO-gated) -> copy w/ a per-step template override that edits an
 * existing file's workflow-area markers in place -> cd -> command -> command.
 *
 * This is the stand-in for the future CLI's "run next step" loop — it's
 * written inline here since `new-workflows/cli` doesn't exist yet.
 */
describe("add-workflow proof (ported to the new engine)", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
  });

  it("runs every step to completion, persisting logs across channels", async () => {
    const workflowId = "test/add-workflow";
    const sourceDir = mkdtempSync(path.join(tmpdir(), "new-workflows-source-"));
    const targetDir = mkdtempSync(path.join(tmpdir(), "new-workflows-target-"));

    // Package shell the new workflow file gets scaffolded into.
    writeFileSync(
      path.join(targetDir, "package.json"),
      JSON.stringify({ name: "@example/target-package" }),
    );
    mkdirSync(path.join(targetDir, "workflows"));

    // Template for the new workflow file itself (first copy step).
    mkdirSync(path.join(sourceDir, "template"));
    writeFileSync(
      path.join(sourceDir, "template", "__target-name__.ts"),
      `export const templateFileWorkflow = "not-a-todo";\n`,
    );

    // A pre-existing "list.ts"-like file with an empty workflow area, and its
    // template counterpart with the new entry — mirrors add-workflow's second
    // copy step editing `workflows-cli/list.ts` in place.
    const listPath = path.join(targetDir, "list.ts");
    writeFileSync(
      listPath,
      [
        "// BEGIN WORKFLOW AREA workflow-imports FOR test/add-workflow",
        "// END WORKFLOW AREA",
        "",
      ].join("\n"),
    );
    mkdirSync(path.join(sourceDir, "list-template"));
    const listTemplatePath = path.join(sourceDir, "list-template", "list.ts");
    writeFileSync(
      listTemplatePath,
      [
        "// BEGIN WORKFLOW AREA workflow-imports FOR test/add-workflow",
        'import { ExampleWorkflowDefinition } from "./example-workflow.ts";',
        "// END WORKFLOW AREA",
        "",
      ].join("\n"),
    );

    interface Ctx {
      targetDir: string;
      sourceDir: string;
      listTemplatePath: string;
    }

    const AddWorkflowDefinition: WorkflowDefinition<Record<string, unknown>, Ctx> =
      defineWorkflow<Record<string, unknown>, Ctx>({
        id: workflowId,
        description: "Proof-of-concept port of workflows/add-workflow",
        context: () => ({ targetDir, sourceDir, listTemplatePath }),
        steps: [
          step<CopyStepInput, Ctx>(
            "copy",
            runCopyStep,
            ({ context }) => ({
              targetDir: context.targetDir,
              templateFiles: { workflow: path.join(context.sourceDir, "template") },
            }),
          ),
          step<UpdateStepInput, Ctx>("update", runUpdateStep, () => ({
            fileId: "workflow-0",
            prompt: "Implement the new workflow file.",
          })),
          step<CopyStepInput, Ctx>(
            "copy",
            runCopyStep,
            ({ context }) => ({
              targetDir: context.targetDir,
              templateFiles: { list: context.listTemplatePath },
            }),
          ),
          step<CdStepInput, Ctx>("cd", runCdStep, ({ context }) => ({
            path: context.targetDir,
          })),
          step<CommandStepInput, Ctx>("command", runCommandStep, () => ({
            command: "npm",
            args: ["--version"],
          })),
          step<CommandStepInput, Ctx>("command", runCommandStep, () => ({
            command: "npm",
            args: ["--version"],
          })),
        ],
      });

    const runId = await createRun(dbKey, AddWorkflowDefinition, {
      input: {},
      cwd: targetDir,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });

    const allChunks: { channel: string }[] = [];
    let stepCount = 0;
    while (true) {
      const { output, result } = advanceRun(dbKey, AddWorkflowDefinition, runId);
      const chunks = await collectOutput(output);
      allChunks.push(...chunks);
      const outcome = await result;
      stepCount++;
      if (outcome.status === "done") break;
      if (outcome.status === "error") {
        throw new Error(`Step ${stepCount} errored: ${outcome.message}`);
      }
      if (stepCount > 10) throw new Error("Too many steps — possible infinite loop");
    }

    expect(stepCount).toBe(7); // 6 real steps + the terminal "done" check

    const updatedList = readFileSync(listPath, "utf-8");
    expect(updatedList).toContain(
      'import { ExampleWorkflowDefinition } from "./example-workflow.ts";',
    );

    const channels = new Set(allChunks.map((c) => c.channel));
    expect(channels.has("tool")).toBe(true);
    expect(channels.has("terminal")).toBe(true);
    expect(channels.has("agent-input")).toBe(true);
    expect(channels.has("agent")).toBe(true);
  });
});
