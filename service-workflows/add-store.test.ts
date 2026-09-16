import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";

describe("service/add-store (ported to the new engine)", () => {
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

  it("copies the context template with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "service-add-store-"));
    const targetDir = path.join(cwd, "common");
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(
      path.join(targetDir, "package.json"),
      JSON.stringify({ name: "@example/widgets-service-common" }, null, 2),
    );

    const runId = await createRun(dbKey, ServiceAddStoreWorkflowDefinition, {
      input: { name: "recipesFileContainer" },
      cwd: targetDir,
      mode: "script",
    });

    // Just the "copy" step — later steps need a real installed
    // `-service-common` package to run `npm install`/`npm run test`
    // against.
    const { output, result } = advanceRun(dbKey, ServiceAddStoreWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const contextPath = path.join(targetDir, "context.ts");
    expect(readFileSync(contextPath, "utf-8")).toContain("recipesFileContainer");
  });
});
