import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createRun, advanceRun, collectOutput } from "@saflib/new-workflows";
import { OpenApiRouteWorkflowDefinition } from "./add-route.ts";

describe("openapi/route (ported to the new engine)", () => {
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

  it("copies the route template with the operationId substituted", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "openapi-add-route-"));
    mkdirSync(path.join(cwd, "routes", "contacts"), { recursive: true });

    const runId = await createRun(dbKey, OpenApiRouteWorkflowDefinition, {
      input: { path: "./routes/contacts/get-by-id.yaml", urlPath: "/contacts/{id}", method: "get" },
      cwd,
      mode: "script",
    });

    // Just the "copy" step — later steps need a real, generated spec package.
    const { output, result } = advanceRun(dbKey, OpenApiRouteWorkflowDefinition, runId);
    await collectOutput(output);
    const outcome = await result;
    expect(outcome.status).toBe("success");

    const routePath = path.join(cwd, "routes", "contacts", "get-by-id.yaml");
    expect(readFileSync(routePath, "utf-8")).toContain("getByIdContacts");
  });

  it("threads a passed prompt into the update step's prompt text", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "openapi-add-route-"));
    const context = OpenApiRouteWorkflowDefinition.context({
      input: {
        path: "./routes/contacts/get-by-id.yaml",
        urlPath: "/contacts/{id}",
        method: "get",
        prompt: "look up a contact by id",
      },
      cwd,
    });
    const updateStep = OpenApiRouteWorkflowDefinition.steps[1];
    const stepInput = updateStep.input({ context }) as { prompt: string };
    expect(stepInput.prompt).toContain("Task: look up a contact by id");
  });
});
