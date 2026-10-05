import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { AddSdkQueryWorkflowDefinition } from "./add-query.ts";

describe("sdk/add-query (ported to the new engine)", () => {
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

  it("copies query templates with name substitution applied", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "sdk-add-query-"));
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "@example/widgets-sdk" }, null, 2),
    );
    mkdirSync(path.join(cwd, "requests", "contacts"), { recursive: true });

    const runId = await createRun(dbKey, AddSdkQueryWorkflowDefinition, {
      input: { path: "./requests/contacts/list.ts", urlPath: "/contacts", method: "get" },
      cwd,
      mode: "script",
    });

    const { output, result } = advanceRun(dbKey, AddSdkQueryWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const queryPath = path.join(cwd, "requests", "contacts", "list.ts");
    const content = readFileSync(queryPath, "utf-8");
    expect(content).toContain("listContactsQuery");
    expect(content).toContain("/contacts");
    expect(content).toContain("GET");
    expect(content).not.toContain("__");
  });

  it("threads a passed prompt into the update step's own prompt text", () => {
    const context = AddSdkQueryWorkflowDefinition.context({
      input: { path: "./requests/contacts/list.ts", urlPath: "/contacts", method: "get", prompt: "list contacts alphabetically" },
      cwd: "/repo",
    });
    const updateStep = AddSdkQueryWorkflowDefinition.steps[1];
    const stepInput = updateStep.input({ context }) as { prompt: string };
    expect(stepInput.prompt).toContain("Task: list contacts alphabetically");
  });
});
