import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddCLIWorkflowDefinition } from "./add-cli.ts";

describe("commander/add-cli (ported to the new engine)", () => {
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

  it("copies the CLI entrypoint template with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "commander-add-cli-"));

    const runId = await createRun(dbKey, AddCLIWorkflowDefinition, {
      input: { name: "example-cli" },
      cwd,
      mode: "script",
    });

    // Just the first step: the "copy" step, which physically writes the
    // templated index.ts file. Later steps (`update`/`prompt`/`command`)
    // need a real agent/installed package, so this test stops here.
    const { output, result } = advanceRun(dbKey, AddCLIWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const indexPath = path.join(cwd, "bin", "example-cli", "index.ts");
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain("example-cli");
    expect(content).not.toContain("template-file");
  });
});
