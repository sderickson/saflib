import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import {
  HelloWorkflowDefinition,
  defineWorkflow,
  step,
  CANCELLED_BY_USER_MESSAGE,
} from "@saflib/new-workflows";
import { createNewWorkflowsRouter } from "./index.ts";

const execFileAsync = promisify(execFile);

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
      {
        index: 1,
        kind: "update",
        label: "update: file",
        params: { fileId: "file", prompt: "Take a look at the generated file and confirm it looks right." },
      },
      { index: 2, kind: "command", label: "npm --version", params: { command: "npm", args: "--version" } },
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

describe("POST /api/runs/:runId/advance recovery options", () => {
  let dbKey: DbKey;
  let app: express.Express;
  let cwd: string;
  let attempt: number;

  const FlakyWorkflowDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
    id: "test/flaky",
    description: "Fails on the first attempt, succeeds after.",
    context: ({ input }) => input,
    steps: [
      step<Record<string, never>, Record<string, unknown>>(
        "command",
        async (_input, ctx) => {
          attempt++;
          writeFileSync(path.join(ctx.cwd, `attempt-${attempt}.txt`), "x\n");
          if (attempt === 1) {
            return { status: "error", message: "simulated failure" };
          }
          return { status: "success" };
        },
        () => ({}),
      ),
    ],
  });

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(async () => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
    attempt = 0;
    cwd = mkdtempSync(path.join(tmpdir(), "new-workflows-http-recovery-"));
    await execFileAsync("git", ["init"], { cwd });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd });
    writeFileSync(path.join(cwd, "README.md"), "hello\n");
    await execFileAsync("git", ["add", "-A"], { cwd });
    await execFileAsync("git", ["commit", "-m", "initial"], { cwd });
    app = express();
    app.use(
      createNewWorkflowsRouter({
        dbKey,
        registry: [FlakyWorkflowDefinition],
        defaultCwd: cwd,
      }),
    );
  });

  it("retries with revert after a failure, discarding the failed attempt's file", async () => {
    const created = await request(app)
      .post("/api/workflows/test%2Fflaky/runs")
      .send({ input: {}, mode: "run" });
    const runId = created.body.run.id;

    const failed = await request(app).post(`/api/runs/${runId}/advance`);
    expect(failed.status).toBe(200);
    expect(failed.body.status).toBe("error");
    expect(existsSync(path.join(cwd, "attempt-1.txt"))).toBe(true);

    const retried = await request(app)
      .post(`/api/runs/${runId}/advance`)
      .send({ revert: true });
    expect(retried.status).toBe(200);
    expect(retried.body.status).toBe("success");
    expect(existsSync(path.join(cwd, "attempt-1.txt"))).toBe(false);
    expect(existsSync(path.join(cwd, "attempt-2.txt"))).toBe(true);
  });

  it("skips the current step and advances without running it", async () => {
    const created = await request(app)
      .post("/api/workflows/test%2Fflaky/runs")
      .send({ input: {}, mode: "run" });
    const runId = created.body.run.id;

    const skipped = await request(app)
      .post(`/api/runs/${runId}/advance`)
      .send({ skip: true });
    expect(skipped.status).toBe(200);
    expect(skipped.body).toEqual({ status: "success", result: { skipped: true } });
    expect(attempt).toBe(0);

    const run = await request(app).get(`/api/runs/${runId}`);
    expect(run.body.run.status).toBe("done");
  });
});

describe("GET /api/runs/:runId reports is_advancing from live server state", () => {
  let dbKey: DbKey;
  let app: express.Express;
  let cwd: string;
  let releaseStep: (() => void) | undefined;

  const slowWorkflowDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
    id: "test/slow-http",
    description: "test",
    context: ({ input }) => input,
    steps: [
      step(
        "command",
        () =>
          new Promise<{ status: "success" }>((resolve) => {
            releaseStep = () => resolve({ status: "success" });
          }),
        () => ({}),
      ),
    ],
  });

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
    releaseStep = undefined;
    cwd = mkdtempSync(path.join(tmpdir(), "new-workflows-http-advancing-"));
    app = express();
    app.use(
      createNewWorkflowsRouter({ dbKey, registry: [slowWorkflowDefinition], defaultCwd: cwd }),
    );
  });

  it("is false right after creation, true while a step is actively in flight, false again once it settles", async () => {
    const created = await request(app)
      .post("/api/workflows/test%2Fslow-http/runs")
      .send({ input: {}, mode: "run" });
    const runId = created.body.run.id;
    expect(created.body.run.is_advancing).toBe(false);

    // supertest/superagent requests are lazy — the underlying HTTP call
    // isn't actually dispatched until something consumes the thenable
    // (typically the first `await`/`.then()`), so `.then()` right away to
    // kick it off now rather than only once awaited below.
    const advancePromise = request(app).post(`/api/runs/${runId}/advance`).then((r) => r);
    let midFlightIsAdvancing = false;
    let midFlightStatus = "";
    for (let attempt = 0; !midFlightIsAdvancing && attempt <= 50; attempt++) {
      const midFlight = await request(app).get(`/api/runs/${runId}`);
      midFlightIsAdvancing = midFlight.body.run.is_advancing;
      midFlightStatus = midFlight.body.run.status;
      if (!midFlightIsAdvancing) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(midFlightIsAdvancing).toBe(true);
    // `status` still only reflects the *last completed* step (there isn't
    // one yet) — is_advancing is what actually distinguishes this from a
    // plain idle run.
    expect(midFlightStatus).toBe("pending");

    releaseStep?.();
    await advancePromise;

    const after = await request(app).get(`/api/runs/${runId}`);
    expect(after.body.run.is_advancing).toBe(false);
    expect(after.body.run.status).toBe("done");
  });
});

describe("WorkflowRun.was_cancelled distinguishes a user Stop from a genuine failure", () => {
  let dbKey: DbKey;
  let app: express.Express;
  let cwd: string;

  const cancelledWorkflowDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>(
    {
      id: "test/cancelled-http",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step(
          "command",
          // Same shape claude-agent.ts's cancel handling actually throws —
          // this is how a user-initiated Stop is (and can only be) told
          // apart from a real step error; there's no separate DB status.
          async () => {
            throw new Error(CANCELLED_BY_USER_MESSAGE);
          },
          () => ({}),
        ),
      ],
    },
  );

  const brokenWorkflowDefinition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
    id: "test/broken-http",
    description: "test",
    context: ({ input }) => input,
    steps: [
      step(
        "command",
        async () => {
          throw new Error("something actually went wrong");
        },
        () => ({}),
      ),
    ],
  });

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
    cwd = mkdtempSync(path.join(tmpdir(), "new-workflows-http-cancelled-"));
    app = express();
    app.use(
      createNewWorkflowsRouter({
        dbKey,
        registry: [cancelledWorkflowDefinition, brokenWorkflowDefinition],
        defaultCwd: cwd,
      }),
    );
  });

  it("is true when the failure was a user Stop", async () => {
    const created = await request(app)
      .post("/api/workflows/test%2Fcancelled-http/runs")
      .send({ input: {}, mode: "run" });
    const runId = created.body.run.id;

    const advanced = await request(app).post(`/api/runs/${runId}/advance`);
    expect(advanced.body.status).toBe("error");

    const run = await request(app).get(`/api/runs/${runId}`);
    expect(run.body.run.status).toBe("failed");
    expect(run.body.run.was_cancelled).toBe(true);
  });

  it("is false for a genuine step failure", async () => {
    const created = await request(app)
      .post("/api/workflows/test%2Fbroken-http/runs")
      .send({ input: {}, mode: "run" });
    const runId = created.body.run.id;

    await request(app).post(`/api/runs/${runId}/advance`);

    const run = await request(app).get(`/api/runs/${runId}`);
    expect(run.body.run.status).toBe("failed");
    expect(run.body.run.was_cancelled).toBe(false);
  });

  it("is false for a run that hasn't failed at all", async () => {
    const created = await request(app)
      .post("/api/workflows/test%2Fbroken-http/runs")
      .send({ input: {}, mode: "run" });

    expect(created.body.run.was_cancelled).toBe(false);
  });
});
