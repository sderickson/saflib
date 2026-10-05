import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddE2eTestWorkflowDefinition } from "./add-e2e-test.ts";

describe("vue/add-e2e-test (ported to the new engine)", () => {
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

  it("copies the e2e spec template with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "vue-add-e2e-test-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-spa" }, null, 2),
    );
    mkdirSync(path.join(cwd, "e2e"), { recursive: true });

    const runId = await createRun(dbKey, AddE2eTestWorkflowDefinition, {
      input: { path: "./e2e/my-test.spec.ts" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, AddE2eTestWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const specPath = path.join(cwd, "e2e", "my-test.spec.ts");
    expect(readFileSync(specPath, "utf-8")).toContain("MyTest");
  });

  it("threads a given prompt into the update step's prompt text", () => {
    const context = AddE2eTestWorkflowDefinition.context({
      input: { path: "./e2e/my-test.spec.ts", prompt: "create a todo and confirm it appears" },
      cwd: "/repo",
    });
    const updateStep = AddE2eTestWorkflowDefinition.steps[1];
    const stepInput = updateStep.input({ context }) as { prompt: string };
    expect(stepInput.prompt).toContain("Task: create a todo and confirm it appears");
  });
});
