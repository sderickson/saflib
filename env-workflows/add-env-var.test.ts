import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddEnvVarWorkflowDefinition } from "./add-env-var.ts";

describe("env/add-var (ported to the new engine)", () => {
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

  it("copies env.schema.json with the variable name substituted in", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "env-add-var-"));

    const runId = await createRun(dbKey, AddEnvVarWorkflowDefinition, {
      input: { name: "example_var" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, AddEnvVarWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const schemaPath = path.join(cwd, "env.schema.json");
    const content = readFileSync(schemaPath, "utf-8");
    expect(content).not.toContain("__VARIABLE_NAME__");
    expect(content).toContain("EXAMPLE_VAR");
  });
});
