import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddCommandWorkflowDefinition } from "./add-command.ts";

describe("commander/add-command (ported to the new engine)", () => {
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

  it("copies command/index templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "commander-add-command-"));
    mkdirSync(path.join(cwd, "bin", "example-cli"), { recursive: true });

    const runId = await createRun(dbKey, AddCommandWorkflowDefinition, {
      input: { path: "./bin/example-cli/example-command.ts" },
      cwd,
      mode: "script",
    });

    // Just the first step: the "copy" step, which physically writes the
    // templated command/index files. Later steps (`update`/`prompt`/
    // `command`) need a real agent/installed package, so this test stops
    // here.
    const { output, result } = advanceRun(dbKey, AddCommandWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const commandPath = path.join(cwd, "bin", "example-cli", "example-command.ts");
    const indexPath = path.join(cwd, "bin", "example-cli", "index.ts");
    expect(readFileSync(commandPath, "utf-8")).toContain("addExampleCommandCommand");
    expect(readFileSync(indexPath, "utf-8")).toContain("addExampleCommandCommand");
  });
});
