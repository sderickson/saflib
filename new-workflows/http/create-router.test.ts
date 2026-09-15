import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import { createNewWorkflowsRouter } from "./index.ts";

describe("createNewWorkflowsRouter", () => {
  let dbKey: DbKey;
  let app: express.Express;
  let cwd: string;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
    cwd = mkdtempSync(path.join(tmpdir(), "new-workflows-http-"));
    app = express();
    app.use(
      createNewWorkflowsRouter({
        dbKey,
        registry: [HelloWorkflowDefinition],
        defaultCwd: cwd,
      }),
    );
  });

  it("GET /api/workflows lists the registry", async () => {
    const response = await request(app).get("/api/workflows");
    expect(response.status).toBe(200);
    expect(response.body.workflows).toEqual([
      {
        id: "example/hello",
        description: HelloWorkflowDefinition.description,
        source: "code",
        inputSchema: HelloWorkflowDefinition.inputSchema,
      },
    ]);
  });

  it("runs example/hello to completion via create + repeated advance", async () => {
    const created = await request(app)
      .post("/api/workflows/example%2Fhello/runs")
      .send({ input: { name: "example-thing" }, mode: "run", agentConfig: { cli: "mock-agent" } });
    expect(created.status).toBe(201);
    const runId = created.body.run.id;
    expect(created.body.run.status).toBe("pending");

    let outcome;
    for (let i = 0; i < 10; i++) {
      const advanced = await request(app).post(`/api/runs/${runId}/advance`);
      expect(advanced.status).toBe(200);
      outcome = advanced.body;
      if (outcome.status !== "success") break;
    }
    expect(outcome).toEqual({ status: "done" });

    const got = await request(app).get(`/api/runs/${runId}`);
    expect(got.status).toBe(200);
    expect(got.body.run.status).toBe("done");

    const logs = await request(app).get(`/api/runs/${runId}/logs`);
    expect(logs.status).toBe(200);
    expect(logs.body.logs.length).toBeGreaterThan(0);
    expect(logs.body.logs.some((l: { channel: string }) => l.channel === "terminal")).toBe(true);
  });

  it("POST /api/workflows/:id/runs 404s for an unknown workflow", async () => {
    const response = await request(app)
      .post("/api/workflows/does%2Fnot-exist/runs")
      .send({ input: {} });
    expect(response.status).toBe(404);
  });

  it("GET /api/runs/:runId 404s for an unknown run", async () => {
    const response = await request(app).get("/api/runs/does-not-exist");
    expect(response.status).toBe(404);
  });

  it("POST /api/runs/:runId/cancel is a no-op when nothing is running for that run", async () => {
    const response = await request(app).post("/api/runs/no-agent-running/cancel");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ cancelled: false });
  });

  it("GET /api/runs/:runId/steps lists the workflow's steps", async () => {
    const created = await request(app)
      .post("/api/workflows/example%2Fhello/runs")
      .send({ input: { name: "example-thing" } });
    const runId = created.body.run.id;

    const response = await request(app).get(`/api/runs/${runId}/steps`);
    expect(response.status).toBe(200);
    expect(response.body.steps).toEqual([
      { index: 0, kind: "copy" },
      { index: 1, kind: "update", label: "update: file" },
      { index: 2, kind: "command", label: "npm --version" },
    ]);
  });

  it("GET /api/workflows/:id/runs lists runs for that workflow, newest first", async () => {
    const empty = await request(app).get("/api/workflows/example%2Fhello/runs");
    expect(empty.status).toBe(200);
    expect(empty.body.runs).toEqual([]);

    const first = await request(app)
      .post("/api/workflows/example%2Fhello/runs")
      .send({ input: { name: "one" } });
    const second = await request(app)
      .post("/api/workflows/example%2Fhello/runs")
      .send({ input: { name: "two" } });

    const listed = await request(app).get("/api/workflows/example%2Fhello/runs");
    expect(listed.status).toBe(200);
    expect(listed.body.runs.map((r: { id: string }) => r.id)).toEqual([
      second.body.run.id,
      first.body.run.id,
    ]);
  });
});
