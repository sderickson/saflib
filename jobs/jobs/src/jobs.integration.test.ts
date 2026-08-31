import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import express from "express";
import { asOpenApiDocument } from "@saflib/openapi";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type { DbKey } from "@saflib/drizzle";
import {
  createHandler,
  createInternalCaller,
  createScopedMiddleware,
  makeAdminHeaders,
  startExpressServer,
} from "@saflib/express";
import { jobsDbManager } from "@saflib/jobs-db/instances";

import {
  _resetEnqueueCallersForTests,
  createJobsApp,
  createJobsRouter,
  enqueue,
  runJobs,
  type JobsRuntimeHandle,
} from "../index.ts";
import { _resetJobsWakeForTests } from "./runJobs.ts";

import { cancelByOriginalRequestIdJob, createJob, getByIdJob, listJob } from "@saflib/jobs-db";
const TEST_SECRET = Buffer.from("jobs-integration-test-secret!!").toString(
  "base64",
);
const TEST_KEYS = `jobs-integration:${TEST_SECRET}`;

const jsonOk: OpenAPIV3.ResponseObject = {
  description: "ok",
  content: {
    "application/json": {
      schema: { type: "object", additionalProperties: true },
    },
  },
};

const workApiSpec = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "jobs-integration-work", version: "1.0.0" },
  paths: {
    "/test/start": {
      post: {
        operationId: "testJobStart",
        tags: [],
        responses: { "200": jsonOk },
      },
    },
    "/test/step-b": {
      post: {
        operationId: "testJobStepB",
        tags: ["background"],
        responses: { "200": jsonOk },
      },
    },
    "/test/step-c": {
      post: {
        operationId: "testJobStepC",
        tags: ["background"],
        responses: { "200": jsonOk },
      },
    },
  },
});

const triggerMap = {
  testJobStart: ["testJobStepB"],
  testJobStepB: ["testJobStepC"],
};

const stepCCompletions: string[] = [];

function createWorkApp() {
  const router = express.Router();
  router.use(
    "/test",
    ...createScopedMiddleware({
      apiSpec: workApiSpec,
      enforceAuth: true,
    }),
  );

  router.post(
    "/test/step-b",
    createHandler(async (_req, res) => {
      await enqueue({
        operationId: "testJobStepC",
        request: { body: { label: "integration" } },
      });
      res.status(200).json({ enqueued: "testJobStepC" });
    }),
  );

  router.post(
    "/test/step-c",
    createHandler(async (_req, res) => {
      stepCCompletions.push(randomUUID());
      res.status(200).json({ done: true });
    }),
  );

  const app = express();
  app.use(router);
  return app;
}

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
  timeoutMs = 8_000,
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

describe("jobs integration", () => {
  let dbKey: DbKey;
  let jobsSocketPath: string;
  let workSocketPath: string;
  let closeJobsServer: (() => Promise<void>) | undefined;
  let closeWorkServer: (() => Promise<void>) | undefined;
  let runtime: JobsRuntimeHandle | undefined;
  let adminApp: express.Express;
  let kratosServer: http.Server | undefined;
  let kratosBaseUrl: string;
  const identities = new Map<string, { email: string }>();
  const adminUserId = "admin-integration-user";
  const adminEmail = "admin@example.com";

  beforeAll(async () => {
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", TEST_KEYS);

    const kratos = await startFakeKratos(identities);
    kratosServer = kratos.server;
    kratosBaseUrl = kratos.baseUrl;
    identities.set(adminUserId, { email: adminEmail });

    vi.stubEnv("KRATOS_ADMIN_API_URL", kratosBaseUrl);
    vi.stubEnv("ADMIN_EMAILS", adminEmail);

    const stamp = `${process.pid}-${Date.now()}`;
    const tmp = os.tmpdir();
    jobsSocketPath = path.join(tmp, `ji-jobs-${stamp}.sock`);
    workSocketPath = path.join(tmp, `ji-work-${stamp}.sock`);

    dbKey = jobsDbManager.connect();

    const jobsApp = createJobsApp({
      triggerMap,
      apiSpec: workApiSpec,
      dbKey,
      targetSocketPath: workSocketPath,
    });
    const jobsStarted = startExpressServer(jobsApp, {
      socketPath: jobsSocketPath,
    });
    closeJobsServer = jobsStarted.close;
    await waitForListening(jobsStarted.internalServer!);

    const workStarted = startExpressServer(createWorkApp(), {
      socketPath: workSocketPath,
    });
    closeWorkServer = workStarted.close;
    await waitForListening(workStarted.internalServer!);

    runtime = await runJobs({
      triggerMap,
      apiSpec: workApiSpec,
      targetSocketPath: workSocketPath,
      dbKey,
      operationConfig: {
        testJobStepB: { timeoutMs: 5_000 },
        testJobStepC: { timeoutMs: 5_000 },
      },
    });

    adminApp = express();
    adminApp.use(createJobsRouter({ dbKey }));
  }, 30_000);

  beforeEach(() => {
    jobsDbManager.clearAllTablesForTests(dbKey);
    stepCCompletions.length = 0;
    _resetJobsWakeForTests();
    vi.stubEnv("SAF_JOBS_SOCKET", jobsSocketPath);
  });

  afterEach(async () => {
    await _resetEnqueueCallersForTests();
  });

  afterAll(async () => {
    await runtime?.stop();
    await closeWorkServer?.();
    await closeJobsServer?.();
    for (const sock of [jobsSocketPath, workSocketPath]) {
      if (sock && fs.existsSync(sock)) {
        fs.unlinkSync(sock);
      }
    }
    kratosServer?.close();
    jobsDbManager.disconnect(dbKey);
    vi.unstubAllEnvs();
  });

  it(
    "enqueue API → runJobs delivery → chained enqueue → admin list/detail",
    async () => {
      const chainRoot = `integration-${randomUUID()}`;
      const caller = createInternalCaller({ socketPath: jobsSocketPath });

      try {
        const enqueued = await caller({
          operationId: "enqueueJob",
          method: "POST",
          path: "/jobs",
          body: {
            operationId: "testJobStepB",
            request: { body: { label: "integration" } },
          },
          asUser: { userId: adminUserId, mfaCompleted: true },
          requestId: chainRoot,
          claims: {
            callingOperationId: "testJobStart",
            originalRequestId: chainRoot,
          },
        });
        expect(enqueued.status).toBe(201);
        const enqueueBody = (await enqueued.json()) as {
          job: { id: string };
        };
        const jobBId = enqueueBody.job.id;

        await waitUntil(async () => {
          const { result } = await getByIdJob(dbKey, { id: jobBId });
          return result?.status === "succeeded";
        });

        await waitUntil(async () => {
          const { result } = await listJob(dbKey, {
            originalRequestId: chainRoot,
            operationId: "testJobStepC",
          });
          return result?.some((j) => j.status === "succeeded") ?? false;
        });

        const { result: chainJobs } = await listJob(dbKey, {
          originalRequestId: chainRoot,
        });
        expect(chainJobs!.length).toBeGreaterThanOrEqual(2);
        expect(stepCCompletions.length).toBeGreaterThanOrEqual(1);

        const jobC = chainJobs!.find((j) => j.operationId === "testJobStepC");
        expect(jobC).toMatchObject({
          status: "succeeded",
          originalRequestId: chainRoot,
          enqueuedByOperationId: "testJobStepB",
          parentJobId: jobBId,
        });

        const listed = await request(adminApp)
          .get("/jobs")
          .query({ originalRequestId: chainRoot })
          .set(makeAdminHeaders(adminUserId, adminEmail));
        expect(listed.status).toBe(200);
        expect(listed.body.jobs.length).toBeGreaterThanOrEqual(2);

        const detail = await request(adminApp)
          .get(`/jobs/${jobBId}`)
          .set(makeAdminHeaders(adminUserId, adminEmail));
        expect(detail.status).toBe(200);
        expect(detail.body.job.id).toBe(jobBId);
        expect(detail.body.authorityAssertion).toMatchObject({
          payload: expect.any(String),
          signature: expect.any(String),
          keyId: expect.any(String),
        });
      } finally {
        await caller.close();
      }
    },
    15_000,
  );

  it("rejects enqueue outside the trigger map", async () => {
    const chainRoot = `forbidden-${randomUUID()}`;
    const caller = createInternalCaller({ socketPath: jobsSocketPath });

    try {
      const forbidden = await caller({
        operationId: "enqueueJob",
        method: "POST",
        path: "/jobs",
        body: {
          operationId: "testJobStepC",
          request: { body: {} },
        },
        asUser: { userId: adminUserId, mfaCompleted: true },
        requestId: chainRoot,
        claims: {
          callingOperationId: "testJobStart",
          originalRequestId: chainRoot,
        },
      });
      expect(forbidden.status).toBe(403);
    } finally {
      await caller.close();
    }
  });

  it("cancel-by-original-request cancels a delayed pending chain", async () => {
    const cancelChain = `cancel-${randomUUID()}`;
    const runAt = new Date(Date.now() + 60_000);
    await createJob(dbKey, {
      id: "cancel-pending-job",
      status: "pending",
      operationId: "testJobStepB",
      request: { body: {} },
      userId: adminUserId,
      authority: {
        kind: "request",
        userId: adminUserId,
        requestId: cancelChain,
        assertion: { payload: "p", signature: "s", keyId: "k1" },
      },
      originalRequestId: cancelChain,
      enqueuedByOperationId: "testJobStart",
      parentJobId: null,
      runAt,
      dedupeKey: null,
      concurrencyKey: null,
      priority: 0,
      attempt: 0,
      maxAttempts: 5,
      heartbeatAt: null,
      result: null,
      createdAt: runAt,
      updatedAt: runAt,
      startedAt: null,
      finishedAt: null,
      spawnCap: 1000,
    });

    const { result: cancelledRows } =
      await cancelByOriginalRequestIdJob(dbKey, {
        originalRequestId: cancelChain,
        now: new Date(),
      });
    expect(cancelledRows!.length).toBe(1);
    expect(cancelledRows![0]).toMatchObject({
      status: "cancelled",
      originalRequestId: cancelChain,
      result: { terminalReason: "cancelled-by-chain" },
    });
  });
});
