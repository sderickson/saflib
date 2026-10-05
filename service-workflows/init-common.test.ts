import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { InitCommonWorkflowDefinition } from "./init-common.ts";

describe("service/init-common (ported to the new engine)", () => {
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

  it("copies the service-common package stub, dropping the skipped-stub dependency line", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "service-init-common-"));

    const runId = await createRun(dbKey, InitCommonWorkflowDefinition, {
      input: { name: "widgets-service-common", path: "services/widgets-service-common" },
      cwd,
      mode: "script",
    });

    // Just the first ("copy") step — the "cd"/"command" steps that follow
    // need a real installable package tree to run against.
    const { output, result } = advanceRun(dbKey, InitCommonWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const packageJsonPath = path.join(
      cwd,
      "services",
      "widgets-service-common",
      "package.json",
    );
    const packageJson = readFileSync(packageJsonPath, "utf-8");
    // This workflow's own lineReplace has no "@saflib/base-*" package-name
    // remapping (unlike e.g. drizzle/express's), so the golden package name
    // is faithfully carried through unchanged — same pre-existing behavior
    // as the old engine's version. Once dropped in per makeLineReplace's
    // isSkippedStubRefLine handling, not left half-templated:
    expect(packageJson).toContain('"name": "@saflib/base-service-common"');
    expect(packageJson).not.toContain("__integration-name__");
  });
});
