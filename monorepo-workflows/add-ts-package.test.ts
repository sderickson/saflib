import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddTsPackageWorkflowDefinition } from "./add-ts-package.ts";

describe("monorepo/add-package (ported to the new engine)", () => {
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

  it("copies the package stub with name substitution, skipping the export group stub", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "monorepo-add-ts-package-"));

    const runId = await createRun(dbKey, AddTsPackageWorkflowDefinition, {
      input: { name: "@example-org/example-package", path: "libs/example-package" },
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step — the "transform-file"/"update"/"prompt"/
    // "cd"/"command" steps that follow need a real npm-installable package
    // tree to run against.
    const { output, result } = advanceRun(dbKey, AddTsPackageWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const packageDir = path.join(cwd, "libs", "example-package");
    const packageJson = readFileSync(path.join(packageDir, "package.json"), "utf-8");
    expect(packageJson).toContain("@example-org/example-package");
    expect(packageJson).not.toContain("template-package");

    // Export stubs belong to monorepo/add-export, not a new package shell.
    expect(existsSync(path.join(packageDir, "__group-name__"))).toBe(false);
  });
});
