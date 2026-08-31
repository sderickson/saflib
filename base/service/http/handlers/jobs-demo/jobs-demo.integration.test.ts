/**
 * Jobs demo chain integration — start → step-b → step-c visible on admin /jobs list.
 */
import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import express from "express";
import {
  createErrorMiddleware,
  createGlobalMiddleware,
  makeAdminHeaders,
  makeAuthMiddleware,
  startExpressServer,
} from "@saflib/express";
import {
  _resetEnqueueCallersForTests,
  createJobsApp,
  createJobsRouter,
  runJobs,
  type JobsRuntimeHandle,
} from "@saflib/jobs";
import { jobsDbManager } from "@saflib/jobs-db/instances";
import { listJob } from "@saflib/jobs-db";
import type { DbKey } from "@saflib/drizzle";
import { jsonSpec } from "@saflib/base-spec";
import {
  baseJobOperations,
  baseTriggerMap,
} from "@saflib/base-jobs";
import {
  baseServiceStorage,
  makeContext,
} from "@saflib/base-service-common/context";
import { baseDb } from "@saflib/base-db/instances";
import { createJobsDemoRouter } from "./index.ts";
import {
  demoStepCCompletions,
  resetDemoFailureCountersForTests,
  resetDemoStepCCompletionsForTests,
} from "./_helpers.ts";

const TEST_SECRET = Buffer.from("base-jobs-demo-integration-secret").toString(
  "base64",
);
const TEST_KEYS = `base-jobs-demo:${TEST_SECRET}`;
const ADMIN_EMAIL = "admin@saflib.com";

async function waitForListening(server: http.Server): Promise<void> {
  if (!server.listening) {
    await once(server, "listening");
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function startFakeKratos(
  identities: Map<string, { email: string }>,
): Promise<{ server: http.Server; baseUrl: string }> {
  const server = http.createServer((req, res) => {
    const match = req.url?.match(/^\/admin\/identities\/([^/?]+)/);
    if (!match?.[1]) {
      res.writeHead(404);
      res.end();
      return;
    }
    const id = decodeURIComponent(match[1]);
    const identity = identities.get(id);
    if (!identity) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not Found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id,
        state: "active",
        traits: { email: identity.email },
        verifiable_addresses: [{ via: "email", verified: true }],
      }),
    );
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`,
      });
    });
  });
}

async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`waitUntil timed out after ${timeoutMs}ms`);
}

describe("jobs-demo integration", () => {
  let jobsDbKey: DbKey;
  let baseDbKey: DbKey;
  let jobsSocketPath: string;
  let internalSocketPath: string;
  let closeJobsServer: (() => Promise<void>) | undefined;
  let closeHttpServer: (() => Promise<void>) | undefined;
  let runtime: JobsRuntimeHandle | undefined;
  let app: express.Express;
  let kratosServer: http.Server | undefined;
  let kratosBaseUrl: string;
  const identities = new Map<string, { email: string }>();
  const adminUserId = "base-jobs-demo-admin";

  beforeAll(async () => {
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", TEST_KEYS);
    vi.stubEnv("ADMIN_EMAILS", ADMIN_EMAIL);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEPLOYMENT_NAME", "test");

    resetDemoFailureCountersForTests();
    resetDemoStepCCompletionsForTests();

    identities.set(adminUserId, { email: ADMIN_EMAIL });
    const kratos = await startFakeKratos(identities);
    kratosServer = kratos.server;
    kratosBaseUrl = kratos.baseUrl;
    vi.stubEnv("KRATOS_ADMIN_API_URL", kratosBaseUrl);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "base-jobs-demo-"));
    jobsDbKey = jobsDbManager.connect({
      onDisk: path.join(tmpDir, "jobs.sqlite"),
    });
    baseDbKey = baseDb.connect({ onDisk: path.join(tmpDir, "base.sqlite") });

    jobsSocketPath = path.join(tmpDir, "jobs.sock");
    internalSocketPath = path.join(tmpDir, "internal.sock");
    vi.stubEnv("SAF_JOBS_SOCKET", jobsSocketPath);

    const context = makeContext({ baseDbKey });
    runtime = await baseServiceStorage.run(context, () =>
      runJobs({
        triggerMap: baseTriggerMap,
        operationConfig: baseJobOperations,
        apiSpec: jsonSpec,
        targetSocketPath: internalSocketPath,
        dbKey: jobsDbKey,
      }),
    );

    const jobsApp = createJobsApp({
      triggerMap: baseTriggerMap,
      operationConfig: baseJobOperations,
      apiSpec: jsonSpec,
      targetSocketPath: internalSocketPath,
      dbKey: jobsDbKey,
    });
    const jobsLease = startExpressServer(jobsApp, { socketPath: jobsSocketPath });
    closeJobsServer = jobsLease.close;

    app = express();
    app.use(createGlobalMiddleware({ disableCors: true }));
    app.use((_req, _res, next) => {
      baseServiceStorage.run(context, () => next());
    });
    app.use(makeAuthMiddleware());
    app.use(createJobsDemoRouter());
    app.use(createJobsRouter({ dbKey: jobsDbKey }));
    app.use(createErrorMiddleware());

    const httpLease = startExpressServer(app, {
      port: 0,
      socketPath: internalSocketPath,
    });
    closeHttpServer = httpLease.close;

    if (jobsLease.internalServer) {
      await waitForListening(jobsLease.internalServer);
    }
    if (httpLease.server) {
      await waitForListening(httpLease.server);
    }
    if (httpLease.internalServer) {
      await waitForListening(httpLease.internalServer);
    }
  });

  afterAll(async () => {
    await runtime?.stop();
    runtime = undefined;
    await _resetEnqueueCallersForTests();
    await closeHttpServer?.();
    await closeJobsServer?.();
    await new Promise<void>((resolve) => kratosServer?.close(() => resolve()));
    jobsDbManager.disconnect(jobsDbKey);
    baseDb.disconnect(baseDbKey);
    vi.unstubAllEnvs();
  });

  it("runs start → step-b → step-c and lists jobs on admin surface", async () => {
    const adminHeaders = makeAdminHeaders(adminUserId, ADMIN_EMAIL);

    const startRes = await request(app)
      .post("/jobs-demo/start")
      .set(adminHeaders)
      .send({ dedupe_key: "integration-demo" });

    expect(startRes.status).toBe(200);
    expect(startRes.body.job.operation_id).toBe("jobsDemoStepB");

    await waitUntil(async () => demoStepCCompletions.length > 0);

    const listRes = await request(app)
      .get("/jobs")
      .set(adminHeaders)
      .query({ original_request_id: startRes.body.job.original_request_id });

    expect(listRes.status).toBe(200);
    const operationIds = listRes.body.jobs.map(
      (job: { operation_id: string }) => job.operation_id,
    );
    expect(operationIds).toContain("jobsDemoStepB");
    expect(operationIds).toContain("jobsDemoStepC");

    const { result: dbJobs } = await listJob(jobsDbKey, {
      original_request_id: startRes.body.job.original_request_id,
      limit: 20,
      offset: 0,
    });
    expect(dbJobs?.some((j) => j.operation_id === "jobsDemoStepC")).toBe(true);
  });
});
