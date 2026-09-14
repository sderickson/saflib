import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun } from "@saflib/new-workflows";
import { collectOutput } from "@saflib/new-workflows";
import { AddDrizzleQueryWorkflowDefinition } from "./add-query.ts";

describe("drizzle/add-query (ported to the new engine)", () => {
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

  it("copies query/test templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "drizzle-add-query-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-db" }, null, 2),
    );
    mkdirSync(path.join(cwd, "queries", "contacts"), { recursive: true });

    const runId = await createRun(dbKey, AddDrizzleQueryWorkflowDefinition, {
      input: { path: "./queries/contacts/get-by-id.ts" },
      cwd,
      mode: "script",
    });

    // Just the first step: the "copy" step, which physically writes the
    // templated query/test files. Later steps (`update`/`command`) require a
    // real, installed `-db` package to run `npm run typecheck`/`test`
    // against, so this test stops here rather than driving the whole run.
    const { output, result } = advanceRun(dbKey, AddDrizzleQueryWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const queryPath = path.join(cwd, "queries", "contacts", "get-by-id.ts");
    const testPath = path.join(cwd, "queries", "contacts", "get-by-id.test.ts");
    expect(readFileSync(queryPath, "utf-8")).toContain("getByIdContacts");
    expect(readFileSync(testPath, "utf-8")).toContain("getByIdContacts");
  });
});
