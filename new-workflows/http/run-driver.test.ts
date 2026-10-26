import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { defineWorkflow, step } from "@saflib/new-workflows";
import { createNewWorkflowsRouter } from "./index.ts";
import { nextPlanFile } from "./run-driver.ts";

const PLAN = "plans/notes/2026-01-01-example";

/** A workflow whose steps each wait for the test to release them. */
function makeGatedWorkflow() {
  const gates: (() => void)[] = [];
  let started = 0;
  const gatedStep = () =>
    step<Record<string, never>, Record<string, unknown>>(
      "command",
      () =>
        new Promise((resolve) => {
          started++;
          gates.push(() => resolve({ status: "success" }));
        }),
      () => ({}),
    );
  const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
    id: "test/gated",
    description: "Each step waits for the test.",
    context: ({ input }) => input,
    steps: [gatedStep(), gatedStep()],
  });
  return {
    definition,
    started: () => started,
    release: () => gates.shift()?.(),
  };
}

describe("run driver", () => {
  let dbKey: DbKey;
  let app: express.Express;
  let cwd: string;
  let gated: ReturnType<typeof makeGatedWorkflow>;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
    cwd = mkdtempSync(path.join(tmpdir(), "new-workflows-driver-"));
    mkdirSync(path.join(cwd, PLAN), { recursive: true });
    const prompts = (...prompts: string[]) =>
      JSON.stringify({ name: "phase", steps: prompts.map((prompt) => ({ kind: "prompt", prompt })) });
    writeFileSync(path.join(cwd, PLAN, "phase-1.workflow.yaml"), prompts("one", "two"));
    writeFileSync(path.join(cwd, PLAN, "phase-2.workflow.yaml"), prompts("three"));
    writeFileSync(path.join(cwd, PLAN, "spec.md"), "# not a workflow\n");
    gated = makeGatedWorkflow();
    app = express();
    app.use(createNewWorkflowsRouter({ dbKey, registry: [gated.definition], defaultCwd: cwd }));
  });

  async function createRun(ref: string): Promise<string> {
    const created = await request(app)
      .post(`/api/workflows/${encodeURIComponent(ref)}/runs`)
      .send({ input: {}, mode: "run", agentConfig: { cli: "mock-agent" } });
    expect(created.status).toBe(201);
    return created.body.run.id;
  }

  async function settledDrive() {
    for (let i = 0; i < 200; i++) {
      const { body } = await request(app).get("/api/drive");
      if (body.drive && !body.drive.active) return body.drive;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("the driver never settled");
  }

  async function until(condition: () => boolean) {
    for (let i = 0; i < 200 && !condition(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(condition()).toBe(true);
  }

  it("has no drive before anything is driven", async () => {
    const response = await request(app).get("/api/drive");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("plan mode finishes a phase and goes on to drive the next one", async () => {
    const runId = await createRun(`${PLAN}/phase-1.workflow.yaml`);

    const started = await request(app).post(`/api/runs/${runId}/drive`).send({ mode: "plan" });
    expect(started.status).toBe(202);
    expect(started.body.drive).toMatchObject({ run_id: runId, mode: "plan", active: true });

    const drive = await settledDrive();
    expect(drive).toMatchObject({
      workflow_ref: `${PLAN}/phase-2.workflow.yaml`,
      mode: "plan",
      active: false,
      last_outcome: { status: "done" },
    });
    expect(drive.run_id).not.toBe(runId);
    expect(drive.last_outcome.run_id).toBe(drive.run_id);

    for (const id of [runId, drive.run_id]) {
      const { result: run } = await getByIdWorkflowRun(dbKey, { id });
      expect(run).toMatchObject({ status: "done", agent_config: { cli: "mock-agent" } });
    }
  });

  it("workflow mode stops when the run finishes", async () => {
    const runId = await createRun(`${PLAN}/phase-1.workflow.yaml`);
    await request(app).post(`/api/runs/${runId}/drive`).send({ mode: "workflow" });

    const drive = await settledDrive();
    expect(drive).toMatchObject({ run_id: runId, last_outcome: { status: "done", run_id: runId } });
  });

  it("step mode runs one step", async () => {
    const runId = await createRun(`${PLAN}/phase-1.workflow.yaml`);
    await request(app).post(`/api/runs/${runId}/drive`).send({ mode: "step" });

    const drive = await settledDrive();
    expect(drive.last_outcome).toMatchObject({ status: "success", run_id: runId });
    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    expect(run!.current_step_index).toBe(1);
  });

  it("drives one run at a time, and a new mode for the driven run applies after the step in flight", async () => {
    const runId = await createRun("test/gated");
    const otherRunId = await createRun("test/gated");
    await request(app).post(`/api/runs/${runId}/drive`).send({ mode: "workflow" });
    await until(() => gated.started() === 1);

    const conflict = await request(app).post(`/api/runs/${otherRunId}/drive`).send({ mode: "step" });
    expect(conflict.status).toBe(409);

    const changed = await request(app).post(`/api/runs/${runId}/drive`).send({ mode: "step" });
    expect(changed.status).toBe(202);
    expect(changed.body.drive).toMatchObject({ run_id: runId, mode: "step", active: true });

    gated.release();
    const drive = await settledDrive();
    expect(drive.last_outcome).toMatchObject({ status: "success", run_id: runId });
    expect(gated.started()).toBe(1);
  });

  it("stop ends the drive after the step in flight", async () => {
    const runId = await createRun("test/gated");
    await request(app).post(`/api/runs/${runId}/drive`).send({ mode: "workflow" });
    await until(() => gated.started() === 1);

    const stopped = await request(app).post("/api/drive/stop");
    expect(stopped.status).toBe(200);
    expect(stopped.body.drive).toMatchObject({ run_id: runId, mode: "stop" });

    gated.release();
    const drive = await settledDrive();
    expect(drive).toMatchObject({ mode: "stop", active: false });
    expect(gated.started()).toBe(1);
  });

  it("404s for an unknown run", async () => {
    const response = await request(app).post("/api/runs/nope/drive").send({ mode: "step" });
    expect(response.status).toBe(404);
  });
});

describe("nextPlanFile", () => {
  it("is the next YAML file in the same folder, skipping other files", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "next-plan-file-"));
    mkdirSync(path.join(cwd, "plan"));
    for (const name of ["phase-01-a.workflow.yaml", "notes.md", "phase-02-b.workflow.yaml", "phase-10-c.workflow.yml"]) {
      writeFileSync(path.join(cwd, "plan", name), "");
    }
    expect(nextPlanFile(cwd, "plan/phase-01-a.workflow.yaml")).toBe("plan/phase-02-b.workflow.yaml");
    expect(nextPlanFile(cwd, "plan/phase-02-b.workflow.yaml")).toBe("plan/phase-10-c.workflow.yml");
    expect(nextPlanFile(cwd, "plan/phase-10-c.workflow.yml")).toBeUndefined();
  });

  it("is undefined for a registered workflow id", () => {
    expect(nextPlanFile(tmpdir(), "example/hello")).toBeUndefined();
  });
});
