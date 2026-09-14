import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/drizzle";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import { createNewWorkflowsRouter } from "../../index.ts";
import { newWorkflowsChangeEmitter, runEventsChannel } from "../../change-emitter.ts";

/**
 * The SSE route's replay/heartbeat/lifetime mechanics are the same shape
 * as `node-log-http`'s `createStreamDevLogsHandler`, and the underlying
 * replay/subscribe behavior is already covered by `@saflib/notify`'s own
 * `emitter.test.ts`. What's worth testing here is the integration point
 * these tests don't cover: that `advanceWorkflowRunHandler` actually
 * publishes on the run's own channel.
 */
describe("SSE run events", () => {
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
    cwd = mkdtempSync(path.join(tmpdir(), "new-workflows-http-sse-"));
    app = express();
    app.use(
      createNewWorkflowsRouter({
        dbKey,
        registry: [HelloWorkflowDefinition],
        defaultCwd: cwd,
      }),
    );
  });

  it("advancing a run publishes a hint on that run's own channel", async () => {
    const created = await request(app)
      .post("/api/workflows/example%2Fhello/runs")
      .send({ input: { name: "example-thing" }, mode: "run", agentConfig: { cli: "mock-agent" } });
    const runId = created.body.run.id;

    await request(app).post(`/api/runs/${runId}/advance`);

    const events = newWorkflowsChangeEmitter.getEventsAfter(runEventsChannel(runId), "0");
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({
      operation_id: "advanceWorkflowRun",
      channel_id: runEventsChannel(runId),
    });
  });

  it("does not publish on an unrelated run's channel", async () => {
    const created = await request(app)
      .post("/api/workflows/example%2Fhello/runs")
      .send({ input: { name: "example-thing" }, mode: "run", agentConfig: { cli: "mock-agent" } });
    const runId = created.body.run.id;

    await request(app).post(`/api/runs/${runId}/advance`);

    expect(
      newWorkflowsChangeEmitter.getEventsAfter(runEventsChannel("some-other-run"), "0"),
    ).toEqual([]);
  });
});
