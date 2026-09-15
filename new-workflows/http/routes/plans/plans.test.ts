import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import { createNewWorkflowsRouter } from "../../index.ts";

describe("plans routes", () => {
  let dbKey: DbKey;
  let app: express.Express;
  let cwd: string;
  let plansRoot: string;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
    cwd = mkdtempSync(path.join(tmpdir(), "new-workflows-http-plans-"));
    plansRoot = path.join(cwd, "plans");
    app = express();
    app.use(
      createNewWorkflowsRouter({
        dbKey,
        registry: [HelloWorkflowDefinition],
        defaultCwd: cwd,
        plansRoot,
      }),
    );
  });

  it("GET /api/plans returns an empty list when there is no plans folder yet", async () => {
    const response = await request(app).get("/api/plans");
    expect(response.status).toBe(200);
    expect(response.body.plans).toEqual([]);
  });

  it("creates a plan, lists it, and runs it to completion", async () => {
    const created = await request(app)
      .post("/api/plans")
      .send({
        name: "greet-example",
        body: {
          name: "Greet example",
          steps: [
            {
              kind: "call-workflow",
              workflowId: "example/hello",
              input: { name: "example-thing" },
            },
          ],
        },
      });
    expect(created.status).toBe(201);
    expect(created.body.plan.name).toBe("greet-example");
    expect(created.body.plan.folder).toMatch(/^\d{4}-\d{2}-\d{2}-greet-example$/);
    const file = created.body.plan.files[0];
    expect(file.name).toBe("greet-example.yaml");

    const onDisk = path.join(cwd, file.path);
    expect(existsSync(onDisk)).toBe(true);
    expect(readFileSync(onDisk, "utf-8")).toContain("example/hello");

    const listed = await request(app).get("/api/plans");
    expect(listed.status).toBe(200);
    expect(listed.body.plans).toEqual([created.body.plan]);

    const runCreated = await request(app)
      .post(`/api/workflows/${encodeURIComponent(file.path)}/runs`)
      .send({ mode: "run", agentConfig: { cli: "mock-agent" }, input: {} });
    expect(runCreated.status).toBe(201);
    const runId = runCreated.body.run.id;

    let outcome;
    for (let i = 0; i < 10; i++) {
      const advanced = await request(app).post(`/api/runs/${runId}/advance`);
      expect(advanced.status).toBe(200);
      outcome = advanced.body;
      if (outcome.status !== "success") break;
    }
    expect(outcome).toEqual({ status: "done" });
  });

  it("POST /api/plans rejects a non-kebab-case name", async () => {
    const response = await request(app)
      .post("/api/plans")
      .send({ name: "Not Kebab", body: { name: "x", steps: [] } });
    expect(response.status).toBe(400);
  });

  it("POST /api/plans rejects an invalid config body", async () => {
    const response = await request(app)
      .post("/api/plans")
      .send({ name: "bad-plan", body: { steps: [{ kind: "not-a-real-kind" }] } });
    expect(response.status).toBe(400);
  });

  it("POST /api/workflows/:id/runs refuses a .ts path (no arbitrary code execution over HTTP)", async () => {
    const response = await request(app)
      .post(`/api/workflows/${encodeURIComponent("./some-file.ts")}/runs`)
      .send({ input: {} });
    expect(response.status).toBe(404);
  });
});
