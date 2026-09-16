import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddExportWorkflowDefinition } from "./add-export.ts";

describe("monorepo/add-export (ported to the new engine)", () => {
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

  it("copies export/test templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "monorepo-add-export-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets" }, null, 2),
    );

    const runId = await createRun(dbKey, AddExportWorkflowDefinition, {
      input: { path: "./lib/my-function.ts" },
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step — the "transform-file"/"update"/"command"
    // steps that follow need a real installed package to run against.
    const { output, result } = advanceRun(dbKey, AddExportWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const exportPath = path.join(cwd, "lib", "my-function.ts");
    const testPath = path.join(cwd, "lib", "my-function.test.ts");
    expect(readFileSync(exportPath, "utf-8")).toContain("myFunction");
    expect(readFileSync(testPath, "utf-8")).toContain("myFunction");
  });
});
