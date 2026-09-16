import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddCallWorkflowDefinition } from "./add-call.ts";

describe("integrations/add-call (ported to the new engine)", () => {
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

  it("copies call/mock/bin/index templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "integrations-add-call-"));

    const runId = await createRun(dbKey, AddCallWorkflowDefinition, {
      input: { path: "./calls/parse-file.ts" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, AddCallWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const callPath = path.join(cwd, "calls", "parse-file.ts");
    const mocksPath = path.join(cwd, "calls", "parse-file.mocks.ts");
    const binPath = path.join(cwd, "bin", "parse-file.ts");
    expect(readFileSync(callPath, "utf-8")).toContain("ParseFile");
    expect(readFileSync(mocksPath, "utf-8")).toContain("ParseFile");
    expect(readFileSync(binPath, "utf-8")).toContain("parseFile");
  });
});
