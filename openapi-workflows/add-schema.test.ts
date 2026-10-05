import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { OpenApiSchemaWorkflowDefinition } from "./add-schema.ts";

describe("openapi/schema (ported to the new engine)", () => {
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

  it("copies the schema template into the schemas dir", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "openapi-add-schema-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-openapi" }, null, 2),
    );
    mkdirSync(path.join(cwd, "schemas"), { recursive: true });

    const runId = await createRun(dbKey, OpenApiSchemaWorkflowDefinition, {
      input: { name: "contact" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, OpenApiSchemaWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const schemaPath = path.join(cwd, "schemas", "contact.yaml");
    expect(readFileSync(schemaPath, "utf-8")).toContain("type: object");
  });

  it("threads a passed prompt into the update step's prompt text", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "openapi-add-schema-"));
    const context = OpenApiSchemaWorkflowDefinition.context({
      input: { name: "contact", prompt: "a contact with a name and email" },
      cwd,
    });
    const updateStep = OpenApiSchemaWorkflowDefinition.steps[1];
    const stepInput = updateStep.input({ context }) as { prompt: string };
    expect(stepInput.prompt).toContain("Task: a contact with a name and email");
  });
});
