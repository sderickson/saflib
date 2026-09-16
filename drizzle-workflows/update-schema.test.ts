import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun } from "@saflib/new-workflows";
import { collectOutput } from "@saflib/new-workflows";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";

describe("drizzle/update-schema (ported to the new engine)", () => {
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

  it("rejects a plural schema name unless ignorePlural is set", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "drizzle-update-schema-"));
    mkdirSync(path.join(cwd, "schemas"), { recursive: true });

    const runId = await createRun(dbKey, UpdateSchemaWorkflowDefinition, {
      input: { path: "./schemas/contacts.ts" },
      cwd,
      mode: "script",
    });

    // `context()` — where the plural check lives — only runs once
    // `advanceRun` builds the first step's input, not at `createRun` time.
    const { result } = advanceRun(dbKey, UpdateSchemaWorkflowDefinition, runId);
    await expect(result).rejects.toThrow(/should not be plural/);
  });

  it("copies the schema stub and upserts the live schema.ts with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "drizzle-update-schema-"));
    mkdirSync(path.join(cwd, "schemas"), { recursive: true });

    const runId = await createRun(dbKey, UpdateSchemaWorkflowDefinition, {
      input: { path: "./schemas/contact.ts" },
      cwd,
      mode: "script",
    });

    // Just the first step: the "copy" step, which physically writes the
    // templated schema file (and upserts the live schema.ts barrel). Later
    // steps (`update`/`command`) require a real, installed `-db` package to
    // run `npm run typecheck`/`generate`/`test` against, so this test stops
    // here rather than driving the whole run.
    const { output, result } = advanceRun(dbKey, UpdateSchemaWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const schemaPath = path.join(cwd, "schemas", "contact.ts");
    expect(readFileSync(schemaPath, "utf-8")).toContain("contact");
  });
});
