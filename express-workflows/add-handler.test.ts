import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddHandlerWorkflowDefinition } from "./add-handler.ts";

describe("express/add-handler (ported to the new engine)", () => {
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

  it("cds, skips the upload nested workflow, and copies handler templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "express-add-handler-"));
    const httpDir = path.join(cwd, "http");
    mkdirSync(httpDir, { recursive: true });
    mkdirSync(path.join(cwd, "common"), { recursive: true });
    writeFileSync(
      path.join(httpDir, "package.json"),
      JSON.stringify({ name: "@example/widgets-http" }, null, 2),
    );

    const runId = await createRun(dbKey, AddHandlerWorkflowDefinition, {
      input: { path: "./handlers/widgets/create.ts" },
      cwd: httpDir,
      mode: "script",
    });

    // "cd" (../common), "call-workflow" (skipped — no `upload` flag), "cd"
    // (.), "copy" — four steps to reach the physically-written templates.
    // Later steps need a real installed `-http` package to run
    // `npm run typecheck`/`test` against.
    let outcome;
    for (let i = 0; i < 4; i++) {
      const { output, result } = advanceRun(dbKey, AddHandlerWorkflowDefinition, runId);
      await collectOutput(output);
      outcome = await result;
      if (outcome.status !== "success") break;
    }
    expect(outcome?.status).toBe("success");

    const handlerPath = path.join(httpDir, "handlers", "widgets", "create.ts");
    expect(readFileSync(handlerPath, "utf-8")).toContain("createWidgets");
  });
});
