import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
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

  it("copies the spec template into notes/<date>-<name> and pauses before phase workflows", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "spec-project-"));

    const runId = await createRun(dbKey, SpecProjectWorkflowDefinition, {
      input: { name: "example-project", prompt: "Track widgets." },
      cwd,
      mode: "script",
    });

    // Copy succeeds. The update step is script-mode (no agent) and then
    // pauseAfter hands back awaiting_user instead of running the phase-yaml step.
    const first = advanceRun(dbKey, SpecProjectWorkflowDefinition, runId);
    await collectOutput(first.output);
    expect((await first.result).status).toBe("success");

    const second = advanceRun(dbKey, SpecProjectWorkflowDefinition, runId);
    await collectOutput(second.output);
    const paused = await second.result;
    expect(paused.status).toBe("awaiting_user");
    if (paused.status === "awaiting_user") {
      expect(paused.message).toMatch(/Review it/);
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const projectDir = path.join(cwd, "notes", `${dateStr}-example-project`);
    expect(
      readFileSync(path.join(projectDir, "example-project.spec.md"), "utf-8"),
    ).toContain("Feature Specification Template");
    expect(existsSync(path.join(projectDir, "example-project.plan.md"))).toBe(false);
    expect(existsSync(path.join(projectDir, "example-project.workflow.ts"))).toBe(false);
  });

  it("writes the spec into the phase-0 folder when launched from there", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "spec-project-inplace-"));
    writeFileSync(path.join(cwd, "phase-0-plan.workflow.yaml"), "name: placeholder\nsteps: []\n");

    const runId = await createRun(dbKey, SpecProjectWorkflowDefinition, {
      input: { name: "example-project" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, SpecProjectWorkflowDefinition, runId);
    await collectOutput(output);
    expect((await result).status).toBe("success");

    expect(readFileSync(path.join(cwd, "example-project.spec.md"), "utf-8")).toContain(
      "Feature Specification Template",
    );
    expect(existsSync(path.join(cwd, "notes"))).toBe(false);
  });
});
