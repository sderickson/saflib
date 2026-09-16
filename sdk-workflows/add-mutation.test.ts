import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddSdkMutationWorkflowDefinition } from "./add-mutation.ts";

describe("sdk/add-mutation (ported to the new engine)", () => {
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

  it("copies mutation templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "sdk-add-mutation-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-sdk" }, null, 2),
    );
    mkdirSync(path.join(cwd, "requests", "contacts"), { recursive: true });

    const runId = await createRun(dbKey, AddSdkMutationWorkflowDefinition, {
      input: { path: "./requests/contacts/create.ts", urlPath: "/contacts", method: "post" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, AddSdkMutationWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const mutationPath = path.join(cwd, "requests", "contacts", "create.ts");
    const content = readFileSync(mutationPath, "utf-8");
    expect(content).not.toContain("__");
  });
});
