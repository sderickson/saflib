import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
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
import express from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type { DbKey } from "@saflib/drizzle";
import { verifyAssertion } from "@saflib/node";
import { startExpressServer } from "@saflib/express";
import { jobsDbManager } from "jobs-db/instances";
import { jobQueries } from "jobs-db";
import type { JobAuthority, JobRequest, JobStatus } from "jobs-db";
import {
  BACKOFF_BASE_MS,
  DEFAULT_TIMEOUT_MS,
  ERROR_BODY_CAP_BYTES,
  HEARTBEAT_INTERVAL_MS,
  STALL_GRACE_MS,
} from "./constants.ts";
import {
  classifyDelivery,
  computeBackoffMs,
  parseRetryAfterMs,
} from "./classify.ts";
import {
  _resetJobsWakeForTests,
  runJobs,
  signalJobsWake,
  type JobsRuntimeHandle,
} from "./runJobs.ts";

const SERVER_SECRET = Buffer.from("jobs-runtime-test-secret!!!!").toString(
  "base64",
);
const SERVER_KEYS = `jobs-test:${SERVER_SECRET}`;

const apiSpec: OpenAPIV3.DocumentV3 = {
  openapi: "3.0.0",
  info: { title: "jobs-runtime-test", version: "1.0.0" },
  paths: {
    "/jobs-demo/start": {
      post: {
        operationId: "startJobsDemo",
        tags: ["jobs-demo"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/jobs-demo/step-b": {
      post: {
        operationId: "jobsDemoStepB",
        tags: ["background"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/jobs-demo/step-c": {
      post: {
        operationId: "jobsDemoStepC",
        tags: ["background"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/jobs-demo/work": {
      post: {
        operationId: "jobsDemoWork",
        tags: ["background"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

const triggerMap = {
  startJobsDemo: ["jobsDemoStepB", "jobsDemoWork"],
  jobsDemoStepB: ["jobsDemoStepC"],
};

type ScriptedResponse =
  | {
      status: number;
      body?: unknown;
      headers?: Record<string, string>;
      delayMs?: number;
    }
  | ((req: express.Request, res: express.Response) => void | Promise<void>);

type SeedJob = {
  id: string;
  status?: JobStatus;
  operationId?: string;
  request?: JobRequest;
  userId?: string;
  authority?: JobAuthority;
  originalRequestId?: string;
  enqueuedByOperationId?: string;
  parentJobId?: string | null;
  runAt?: Date;
  dedupeKey?: string | null;
  concurrencyKey?: string | null;
  priority?: number;
  attempt?: number;
  maxAttempts?: number;
  heartbeatAt?: Date | null;
  result?: null;
  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  spawnCap?: number;
};

function jobParams(overrides: SeedJob) {
  const now = new Date();
  return {
    status: "pending" as const,
    operationId: "jobsDemoWork",
    request: { body: {} } satisfies JobRequest,
    userId: "user-1",
    authority: {
      kind: "request" as const,
      userId: "user-1",
      requestId: "r-root",
      assertion: { payload: "p", signature: "s", keyId: "k1" },
    },
    originalRequestId: "r-chain-1",
    enqueuedByOperationId: "startJobsDemo",
    parentJobId: null,
    runAt: now,
    dedupeKey: null,
    concurrencyKey: null,
    priority: 0,
    attempt: 0,
    maxAttempts: 5,
    heartbeatAt: null,
    result: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    spawnCap: 1000,
    ...overrides,
  };
}

async function waitForListening(server: http.Server): Promise<void> {
  if (!server.listening) {
    await once(server, "listening");
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function waitForJob(
  dbKey: DbKey,
  id: string,
  predicate: (
    job: NonNullable<
      Awaited<ReturnType<typeof jobQueries.getByIdJob>>["result"]
    >,
  ) => boolean,
  timeoutMs = 8_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { result, error } = await jobQueries.getByIdJob(dbKey, { id });
    expect(error).toBeUndefined();
    if (result && predicate(result)) {
      return result;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  const { result } = await jobQueries.getByIdJob(dbKey, { id });
  throw new Error(
    `Timed out waiting for job ${id}; last status=${result?.status} result=${JSON.stringify(result?.result)}`,
  );
}

describe("classifyDelivery", () => {
  it("treats 2xx as succeeded", async () => {
    const classification = await classifyDelivery({
      response: new Response(null, { status: 204 }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification).toEqual({
      kind: "succeeded",
      statusCode: 204,
      metricStatus: "succeeded",
    });
  });

  it("retries 5xx while attempts remain", async () => {
    const classification = await classifyDelivery({
      response: new Response("boom", { status: 503 }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification.kind).toBe("retry");
    if (classification.kind === "retry") {
      expect(classification.statusCode).toBe(503);
      expect(classification.metricStatus).toBe("retryable-failure");
    }
  });

  it("exhausts retries into dead", async () => {
    const classification = await classifyDelivery({
      response: new Response("boom", { status: 500 }),
      attempt: 5,
      maxAttempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminalReason: "exhausted",
      metricStatus: "dead",
    });
  });

  it("marks other 4xx as permanent-status", async () => {
    const classification = await classifyDelivery({
      response: new Response("nope", { status: 422 }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminalReason: "permanent-status",
      statusCode: 422,
    });
  });

  it("honors X-Jobs-Retry: never on 5xx", async () => {
    const classification = await classifyDelivery({
      response: new Response("stop", {
        status: 500,
        headers: { "X-Jobs-Retry": "never" },
      }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminalReason: "rejected-by-endpoint",
    });
  });

  it("treats X-Jobs-Retry: never on 2xx as succeeded", async () => {
    const classification = await classifyDelivery({
      response: new Response(null, {
        status: 204,
        headers: { "X-Jobs-Retry": "never" },
      }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification).toEqual({
      kind: "succeeded",
      statusCode: 204,
      metricStatus: "succeeded",
    });
  });

  it("honors X-Jobs-Retry: always on 4xx", async () => {
    const classification = await classifyDelivery({
      response: new Response("later", {
        status: 400,
        headers: { "X-Jobs-Retry": "always" },
      }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification.kind).toBe("retry");
  });

  it("honors Retry-After on 429", async () => {
    const classification = await classifyDelivery({
      response: new Response("slow down", {
        status: 429,
        headers: { "Retry-After": "42" },
      }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification.kind).toBe("retry");
    if (classification.kind === "retry") {
      expect(classification.retryAfterMs).toBe(42_000);
    }
  });

  it("marks 401 auth_unresolvable as dead", async () => {
    const classification = await classifyDelivery({
      response: new Response(JSON.stringify({ code: "auth_unresolvable" }), {
        status: 401,
      }),
      attempt: 1,
      maxAttempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminalReason: "auth-unresolvable",
    });
  });

  it("retries timeouts while attempts remain", async () => {
    const classification = await classifyDelivery({
      timedOut: true,
      attempt: 2,
      maxAttempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "retry",
      metricStatus: "timeout",
    });
  });
});

describe("computeBackoffMs / parseRetryAfterMs", () => {
  it("applies exponential backoff with jitter bounds", () => {
    expect(computeBackoffMs(1, () => 0)).toBe(Math.floor(BACKOFF_BASE_MS * 0.5));
    expect(computeBackoffMs(1, () => 1)).toBe(BACKOFF_BASE_MS);
    expect(computeBackoffMs(2, () => 1)).toBe(BACKOFF_BASE_MS * 4);
  });

  it("parses Retry-After delay-seconds and HTTP-date", () => {
    expect(parseRetryAfterMs("10")).toBe(10_000);
    const now = new Date("2026-08-06T12:00:00.000Z");
    expect(
      parseRetryAfterMs("Thu, 06 Aug 2026 12:00:30 GMT", now),
    ).toBe(30_000);
  });
});

describe("runJobs", () => {
  let dbKey: DbKey;
  let socketPath: string;
  let serverClose: (() => Promise<void>) | undefined;
  let runtime: JobsRuntimeHandle | undefined;
  let scripts: ScriptedResponse[];
  let lastAssertion: ReturnType<typeof verifyAssertion> | undefined;

  function makeTargetApp() {
    const app = express();
    app.use(express.json({ limit: "1mb" }));
    app.use((req, _res, next) => {
      const token = req.header("x-saf-identity-assertion");
      if (token) {
        lastAssertion = verifyAssertion(token);
      }
      next();
    });

    const handle = async (
      req: express.Request,
      res: express.Response,
    ): Promise<void> => {
      const script = scripts.shift();
      if (!script) {
        res.status(500).json({ error: "no scripted response left" });
        return;
      }
      if (typeof script === "function") {
        await script(req, res);
        return;
      }
      if (script.delayMs) {
        await new Promise((r) => setTimeout(r, script.delayMs));
      }
      for (const [key, value] of Object.entries(script.headers ?? {})) {
        res.setHeader(key, value);
      }
      if (script.body === undefined) {
        res.status(script.status).end();
      } else if (typeof script.body === "string") {
        res.status(script.status).type("text/plain").send(script.body);
      } else {
        res.status(script.status).json(script.body);
      }
    };

    app.post("/jobs-demo/step-b", (req, res) => {
      void handle(req, res);
    });
    app.post("/jobs-demo/step-c", (req, res) => {
      void handle(req, res);
    });
    app.post("/jobs-demo/work", (req, res) => {
      void handle(req, res);
    });
    return app;
  }

  async function startRuntime(
    overrides: Partial<Parameters<typeof runJobs>[0]> = {},
  ): Promise<JobsRuntimeHandle> {
    runtime = await runJobs({
      triggerMap,
      apiSpec,
      targetSocketPath: socketPath,
      dbKey,
      operationConfig: {
        jobsDemoWork: { timeoutMs: 2_000 },
        jobsDemoStepB: { timeoutMs: 2_000 },
        jobsDemoStepC: { timeoutMs: 2_000 },
      },
      ...overrides,
    });
    return runtime;
  }

  beforeAll(async () => {
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", SERVER_KEYS);
    dbKey = jobsDbManager.connect();
    // Keep socket paths short — macOS sun_path is ~104 bytes.
    socketPath = path.join(os.tmpdir(), `j${process.pid}.sock`);
    scripts = [];
    const started = startExpressServer(makeTargetApp(), { socketPath });
    serverClose = started.close;
    await waitForListening(started.internalServer!);
  });

  afterAll(async () => {
    if (serverClose) {
      await serverClose();
    }
    if (socketPath && fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }
    jobsDbManager.disconnect(dbKey);
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", SERVER_KEYS);
    jobsDbManager.clearAllTablesForTests(dbKey);
    scripts = [];
    lastAssertion = undefined;
    _resetJobsWakeForTests();
  });

  afterEach(async () => {
    if (runtime) {
      await runtime.stop();
      runtime = undefined;
    }
    _resetJobsWakeForTests();
    vi.restoreAllMocks();
  });

  it("delivers a pending job to success with assertion claims", async () => {
    scripts.push({ status: 200, body: { ok: true } });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-ok" }));
    await startRuntime();

    const job = await waitForJob(
      dbKey,
      "job-ok",
      (j) => j.status === "succeeded",
    );
    expect(job.result).toEqual({ statusCode: 200 });
    expect(lastAssertion?.userId).toBe("user-1");
    expect(lastAssertion?.targetOperationId).toBe("jobsDemoWork");
    expect(lastAssertion?.claims).toMatchObject({
      jobId: "job-ok",
      originalRequestId: "r-chain-1",
    });
  });

  it("classifies permanent 4xx as dead", async () => {
    scripts.push({ status: 422, body: { error: "gone" } });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-4xx" }));
    await startRuntime();

    const job = await waitForJob(dbKey, "job-4xx", (j) => j.status === "dead");
    expect(job.result?.terminalReason).toBe("permanent-status");
    expect(job.result?.statusCode).toBe(422);
  });

  it(
    "retries 5xx with backoff then succeeds",
    async () => {
      vi.spyOn(Math, "random").mockReturnValue(1);
      scripts.push({ status: 503, body: "try again" });
      scripts.push({ status: 200, body: { ok: true } });
      await jobQueries.createJob(dbKey, jobParams({ id: "job-5xx" }));
      await startRuntime();

      const retrying = await waitForJob(
        dbKey,
        "job-5xx",
        (j) => j.status === "retrying",
      );
      expect(retrying.attempt).toBe(1);
      expect(retrying.result?.statusCode).toBe(503);
      const delay = retrying.runAt.getTime() - Date.now();
      expect(delay).toBeGreaterThan(BACKOFF_BASE_MS - 1_000);
      expect(delay).toBeLessThan(BACKOFF_BASE_MS + 1_000);

      // Poll backstop picks the job up after backoff (~5s with random=1).
      const succeeded = await waitForJob(
        dbKey,
        "job-5xx",
        (j) => j.status === "succeeded",
        12_000,
      );
      expect(succeeded.attempt).toBe(2);
      expect(succeeded.result?.statusCode).toBe(200);
    },
    15_000,
  );

  it("honors X-Jobs-Retry never and always via delivery", async () => {
    scripts.push({
      status: 500,
      headers: { "X-Jobs-Retry": "never" },
      body: "stop",
    });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-never" }));
    await startRuntime();
    const dead = await waitForJob(
      dbKey,
      "job-never",
      (j) => j.status === "dead",
    );
    expect(dead.result?.terminalReason).toBe("rejected-by-endpoint");
    await runtime!.stop();
    runtime = undefined;

    jobsDbManager.clearAllTablesForTests(dbKey);
    scripts.push({
      status: 400,
      headers: { "X-Jobs-Retry": "always" },
      body: "retry me",
    });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-always" }));
    await startRuntime();
    const retrying = await waitForJob(
      dbKey,
      "job-always",
      (j) => j.status === "retrying",
    );
    expect(retrying.result?.statusCode).toBe(400);
  });

  it("honors Retry-After on 429 for runAt scheduling", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    scripts.push({
      status: 429,
      headers: { "Retry-After": "90" },
      body: "slow",
    });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-429" }));
    const before = Date.now();
    await startRuntime();
    const retrying = await waitForJob(
      dbKey,
      "job-429",
      (j) => j.status === "retrying",
    );
    expect(retrying.runAt.getTime()).toBeGreaterThanOrEqual(
      before + 90_000 - 2_000,
    );
  });

  it("marks auth_unresolvable as dead without retry", async () => {
    scripts.push({
      status: 401,
      body: { code: "auth_unresolvable", message: "gone" },
    });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-auth" }));
    await startRuntime();
    const dead = await waitForJob(
      dbKey,
      "job-auth",
      (j) => j.status === "dead",
    );
    expect(dead.result?.terminalReason).toBe("auth-unresolvable");
  });

  it("aborts at the operation timeout and schedules retry", async () => {
    scripts.push({ status: 200, delayMs: 500, body: { too: "late" } });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-timeout" }));
    await startRuntime({
      operationConfig: {
        jobsDemoWork: { timeoutMs: 50 },
      },
    });
    const retrying = await waitForJob(
      dbKey,
      "job-timeout",
      (j) => j.status === "retrying",
      5_000,
    );
    expect(retrying.result?.errorBody).toMatch(/timed out/i);
  });

  it("caps stored errorBody at 8KB", async () => {
    const huge = "x".repeat(ERROR_BODY_CAP_BYTES + 2048);
    scripts.push({ status: 500, body: huge });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-cap" }));
    await startRuntime();
    const retrying = await waitForJob(
      dbKey,
      "job-cap",
      (j) => j.status === "retrying",
    );
    expect(Buffer.byteLength(retrying.result?.errorBody ?? "", "utf8")).toBe(
      ERROR_BODY_CAP_BYTES,
    );
  });

  it("wake claims without waiting for the poll interval", async () => {
    await startRuntime();
    const claimSpy = vi.spyOn(jobQueries, "claimNextJob");
    claimSpy.mockClear();

    scripts.push({ status: 200, body: { ok: true } });
    await jobQueries.createJob(dbKey, jobParams({ id: "job-wake" }));
    const start = Date.now();
    signalJobsWake();
    await waitForJob(dbKey, "job-wake", (j) => j.status === "succeeded");
    expect(Date.now() - start).toBeLessThan(450);
    expect(claimSpy).toHaveBeenCalled();
  });

  it(
    "recovers a stalled running job on startup then redelivers",
    async () => {
      const stale = new Date(
        Date.now() - (DEFAULT_TIMEOUT_MS + STALL_GRACE_MS + 1_000),
      );
      await jobQueries.createJob(
        dbKey,
        jobParams({
          id: "job-stalled",
          status: "running",
          attempt: 1,
          maxAttempts: 5,
          startedAt: stale,
          heartbeatAt: stale,
          runAt: stale,
        }),
      );
      scripts.push({ status: 200, body: { recovered: true } });
      await startRuntime();
      const succeeded = await waitForJob(
        dbKey,
        "job-stalled",
        (j) => j.status === "succeeded",
      );
      expect(succeeded.attempt).toBeGreaterThanOrEqual(2);
    },
    10_000,
  );

  it(
    "uses per-operation timeout for stall recovery instead of the global max",
    async () => {
      const shortStale = new Date(Date.now() - (2_000 + STALL_GRACE_MS + 500));
      const longStale = new Date(
        Date.now() - (DEFAULT_TIMEOUT_MS + STALL_GRACE_MS + 500),
      );

      await jobQueries.createJob(
        dbKey,
        jobParams({
          id: "job-short-timeout",
          operationId: "jobsDemoWork",
          status: "running",
          attempt: 1,
          maxAttempts: 5,
          startedAt: shortStale,
          heartbeatAt: shortStale,
          runAt: shortStale,
        }),
      );
      await jobQueries.createJob(
        dbKey,
        jobParams({
          id: "job-long-timeout",
          operationId: "jobsDemoStepC",
          status: "running",
          attempt: 1,
          maxAttempts: 5,
          startedAt: longStale,
          heartbeatAt: longStale,
          runAt: longStale,
        }),
      );

      scripts.push({ status: 200, body: { ok: true } });
      await startRuntime({
        operationConfig: {
          jobsDemoWork: { timeoutMs: 2_000 },
          jobsDemoStepC: { timeoutMs: 120_000 },
        },
      });

      const shortJob = await waitForJob(
        dbKey,
        "job-short-timeout",
        (j) => j.status === "succeeded",
      );
      expect(shortJob.attempt).toBeGreaterThanOrEqual(2);

      const { result: longJob } = await jobQueries.getByIdJob(dbKey, {
        id: "job-long-timeout",
      });
      expect(longJob?.status).toBe("running");
    },
    10_000,
  );

  it(
    "heartbeats while a delivery is in flight",
    async () => {
      let heartbeatAtStart: Date | null | undefined;
      let heartbeatAtAfterInterval: Date | null | undefined;
      scripts.push(async (_req, res) => {
        const start = await jobQueries.getByIdJob(dbKey, { id: "job-hb" });
        heartbeatAtStart = start.result?.heartbeatAt;
        await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS + 300));
        const mid = await jobQueries.getByIdJob(dbKey, { id: "job-hb" });
        heartbeatAtAfterInterval = mid.result?.heartbeatAt;
        res.status(200).json({ ok: true });
      });
      await jobQueries.createJob(dbKey, jobParams({ id: "job-hb" }));
      // Delivery timeout must exceed the heartbeat interval for this test.
      await startRuntime({
        operationConfig: {
          jobsDemoWork: { timeoutMs: 15_000 },
        },
      });
      await waitForJob(
        dbKey,
        "job-hb",
        (j) => j.status === "succeeded",
        12_000,
      );
      expect(heartbeatAtStart).toBeTruthy();
      expect(heartbeatAtAfterInterval).toBeTruthy();
      expect(heartbeatAtAfterInterval!.getTime()).toBeGreaterThan(
        heartbeatAtStart!.getTime(),
      );
    },
    20_000,
  );

  it("runs a scripted A→B→C chain end-to-end", async () => {
    scripts.push(async (_req, res) => {
      const now = new Date();
      await jobQueries.createJob(
        dbKey,
        jobParams({
          id: "job-c",
          operationId: "jobsDemoStepC",
          enqueuedByOperationId: "jobsDemoStepB",
          parentJobId: "job-b",
          originalRequestId: "r-chain-abc",
          runAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      );
      signalJobsWake();
      res.status(200).json({ enqueued: "jobsDemoStepC" });
    });
    scripts.push({ status: 200, body: { done: true } });

    await jobQueries.createJob(
      dbKey,
      jobParams({
        id: "job-b",
        operationId: "jobsDemoStepB",
        originalRequestId: "r-chain-abc",
        enqueuedByOperationId: "startJobsDemo",
      }),
    );
    await startRuntime();

    const jobB = await waitForJob(
      dbKey,
      "job-b",
      (j) => j.status === "succeeded",
    );
    const jobC = await waitForJob(
      dbKey,
      "job-c",
      (j) => j.status === "succeeded",
    );
    expect(jobB.operationId).toBe("jobsDemoStepB");
    expect(jobC.operationId).toBe("jobsDemoStepC");
    expect(jobC.parentJobId).toBe("job-b");
    expect(jobC.originalRequestId).toBe("r-chain-abc");
  });

  it("throws on invalid trigger map at startup", async () => {
    await expect(
      runJobs({
        triggerMap: { startJobsDemo: ["notBackground"] },
        apiSpec,
        targetSocketPath: socketPath,
        dbKey,
      }),
    ).rejects.toThrow(/startup validation failed/i);
  });
});
