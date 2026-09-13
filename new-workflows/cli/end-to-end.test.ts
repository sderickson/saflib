import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, HelloWorkflowDefinition } from "@saflib/new-workflows";
import { runAdvanceLoop } from "./advance-loop.ts";
import { writeRunPointer, readRunPointer } from "./run-pointer.ts";

/**
 * End-to-end proof of the CLI's loop wrapper (what `kickoff`/`next` call)
 * against the real `example/hello` workflow, in `run` mode with the mock
 * agent — the automated stand-in for the plan's manual dogfood run.
 */
describe("CLI advance loop (example/hello, mode: run)", () => {
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

  it("runs to completion, generating the file and writing a run pointer", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "new-workflow-e2e-"));

    const runId = await createRun(dbKey, HelloWorkflowDefinition, {
      input: { name: "example-thing" },
      cwd,
      mode: "run",
      agentConfig: { cli: "mock-agent" },
    });
    writeRunPointer(cwd, { runId, idOrPath: "example/hello" });

    const outcome = await runAdvanceLoop(dbKey, HelloWorkflowDefinition, runId);

    expect(outcome).toEqual({ status: "done" });
    expect(readRunPointer(cwd)).toEqual({ runId, idOrPath: "example/hello" });
    const generatedPath = path.join(cwd, "example-thing.ts");
    expect(existsSync(generatedPath)).toBe(true);
    expect(readFileSync(generatedPath, "utf-8")).toContain("exampleThing");
  });
});
