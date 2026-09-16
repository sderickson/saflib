import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { SpecProjectWorkflowDefinition } from "./spec-project.ts";

describe("processes/spec-project (ported to the new engine)", () => {
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

  it("copies spec/workflow/plan templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "spec-project-"));

    const runId = await createRun(dbKey, SpecProjectWorkflowDefinition, {
      input: { name: "example-project" },
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step — the "update"/"prompt"/"command" steps
    // that follow need a real agent.
    const { output, result } = advanceRun(dbKey, SpecProjectWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const dateStr = new Date().toISOString().split("T")[0];
    const projectDir = path.join(cwd, "notes", `${dateStr}-example-project`);
    expect(
      readFileSync(path.join(projectDir, "example-project.spec.md"), "utf-8"),
    ).toContain("Feature Specification Template");
    expect(readFileSync(path.join(projectDir, "example-project.plan.md"), "utf-8")).toBeTruthy();
    expect(
      readFileSync(path.join(projectDir, "example-project.workflow.ts"), "utf-8"),
    ).toContain("ExampleProject");
  });
});
