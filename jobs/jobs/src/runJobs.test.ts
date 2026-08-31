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
import { asOpenApiDocument } from "@saflib/openapi";
import type { DbKey } from "@saflib/drizzle";
import { verifyAssertion } from "@saflib/node";
import { startExpressServer } from "@saflib/express";
import { jobsDbManager } from "@saflib/jobs-db/instances";

import type { JobAuthority, JobRequest, JobStatus } from "@saflib/jobs-db";
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

import { createJob, getByIdJob } from "@saflib/jobs-db";
const SERVER_SECRET = Buffer.from("jobs-runtime-test-secret!!!!").toString(
  "base64",
);
const SERVER_KEYS = `jobs-test:${SERVER_SECRET}`;

const apiSpec = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "jobs-runtime-test", version: "1.0.0" },
  paths: {
    "/jobs-demo/start": {
      post: {
        operationId: "startJobsDemo",
        tags: ["site-admin-only"],
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
});

const triggerMap = {
  startJobsDemo: ["jobsDemoStepB", "jobsDemoWork"],
  jobsDemoStepB: ["jobsDemoStepC"],
};

type ScriptedResponse =
  | {
      status: number;
      body?: unknown;
      headers?: Record<string, string>;
      delay_ms?: number;
    }
  | ((req: express.Request, res: express.Response) => void | Promise<void>);

type SeedJob = {
  id: string;
  status?: JobStatus;
  operation_id?: string;
  request?: JobRequest;
  user_id?: string;
  authority?: JobAuthority;
  original_request_id?: string;
  enqueued_by_operation_id?: string;
  parent_job_id?: string | null;
  run_at?: Date;
  dedupe_key?: string | null;
  concurrency_key?: string | null;
  priority?: number;
  attempt?: number;
  max_attempts?: number;
  heartbeat_at?: Date | null;
  result?: null;
  created_at?: Date;
  updated_at?: Date;
  started_at?: Date | null;
  finished_at?: Date | null;
  spawnCap?: number;
};

function jobParams(overrides: SeedJob) {
  const now = new Date();
  return {
    status: "pending" as const,
    operation_id: "jobsDemoWork",
    request: { body: {} } satisfies JobRequest,
    user_id: "user-1",
    authority: {
      kind: "request" as const,
      user_id: "user-1",
      request_id: "r-root",
      assertion: { payload: "p", signature: "s", key_id: "k1" },
    },
    original_request_id: "r-chain-1",
    enqueued_by_operation_id: "startJobsDemo",
    parent_job_id: null,
    run_at: now,
    dedupe_key: null,
    concurrency_key: null,
    priority: 0,
    attempt: 0,
    max_attempts: 5,
    heartbeat_at: null,
    result: null,
    created_at: now,
    updated_at: now,
    started_at: null,
    finished_at: null,
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
      Awaited<ReturnType<typeof getByIdJob>>["result"]
    >,
  ) => boolean,
  timeoutMs = 8_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { result, error } = await getByIdJob(dbKey, { id });
    expect(error).toBeUndefined();
    if (result && predicate(result)) {
      return result;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  const { result } = await getByIdJob(dbKey, { id });
  throw new Error(
    `Timed out waiting for job ${id}; last status=${result?.status} result=${JSON.stringify(result?.result)}`,
  );
}

describe("classifyDelivery", () => {
  it("treats 2xx as succeeded", async () => {
    const classification = await classifyDelivery({
      response: new Response(null, { status: 204 }),
      attempt: 1,
      max_attempts: 5,
    });
    expect(classification).toEqual({
      kind: "succeeded",
      status_code: 204,
      metricStatus: "succeeded",
    });
  });

  it("retries 5xx while attempts remain", async () => {
    const classification = await classifyDelivery({
      response: new Response("boom", { status: 503 }),
      attempt: 1,
      max_attempts: 5,
    });
    expect(classification.kind).toBe("retry");
    if (classification.kind === "retry") {
      expect(classification.status_code).toBe(503);
      expect(classification.metricStatus).toBe("retryable-failure");
    }
  });

  it("exhausts retries into dead", async () => {
    const classification = await classifyDelivery({
      response: new Response("boom", { status: 500 }),
      attempt: 5,
      max_attempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminal_reason: "exhausted",
      metricStatus: "dead",
    });
  });

  it("marks other 4xx as permanent-status", async () => {
    const classification = await classifyDelivery({
      response: new Response("nope", { status: 422 }),
      attempt: 1,
      max_attempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminal_reason: "permanent-status",
      status_code: 422,
    });
  });

  it("honors X-Jobs-Retry: never on 5xx", async () => {
    const classification = await classifyDelivery({
      response: new Response("stop", {
        status: 500,
        headers: { "X-Jobs-Retry": "never" },
      }),
      attempt: 1,
      max_attempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminal_reason: "rejected-by-endpoint",
    });
  });

  it("treats X-Jobs-Retry: never on 2xx as succeeded", async () => {
    const classification = await classifyDelivery({
      response: new Response(null, {
        status: 204,
        headers: { "X-Jobs-Retry": "never" },
      }),
      attempt: 1,
      max_attempts: 5,
    });
    expect(classification).toEqual({
      kind: "succeeded",
      status_code: 204,
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
      max_attempts: 5,
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
      max_attempts: 5,
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
      max_attempts: 5,
    });
    expect(classification).toMatchObject({
      kind: "dead",
      terminal_reason: "auth-unresolvable",
    });
  });

  it("retries timeouts while attempts remain", async () => {
    const classification = await classifyDelivery({
      timedOut: true,
      attempt: 2,
      max_attempts: 5,
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
      if (script.delay_ms) {
        await new Promise((r) => setTimeout(r, script.delay_ms));
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
    await createJob(dbKey, jobParams({ id: "job-ok" }));
    await startRuntime();

    const job = await waitForJob(
      dbKey,
      "job-ok",
      (j) => j.status === "succeeded",
    );
    expect(job.result).toEqual({ status_code: 200 });
    expect(lastAssertion?.userId).toBe("user-1");
    expect(lastAssertion?.targetOperationId).toBe("jobsDemoWork");
    expect(lastAssertion?.claims).toMatchObject({
      jobId: "job-ok",
      originalRequestId: "r-chain-1",
    });
  });

  it("classifies permanent 4xx as dead", async () => {
    scripts.push({ status: 422, body: { error: "gone" } });
    await createJob(dbKey, jobParams({ id: "job-4xx" }));
    await startRuntime();

    const job = await waitForJob(dbKey, "job-4xx", (j) => j.status === "dead");
    expect(job.result?.terminal_reason).toBe("permanent-status");
    expect(job.result?.status_code).toBe(422);
  });

  it(
    "retries 5xx with backoff then succeeds",
    async () => {
      vi.spyOn(Math, "random").mockReturnValue(1);
      scripts.push({ status: 503, body: "try again" });
      scripts.push({ status: 200, body: { ok: true } });
      await createJob(dbKey, jobParams({ id: "job-5xx" }));
      await startRuntime();

      const retrying = await waitForJob(
        dbKey,
        "job-5xx",
        (j) => j.status === "retrying",
      );
      expect(retrying.attempt).toBe(1);
      expect(retrying.result?.status_code).toBe(503);
      const delay = retrying.run_at.getTime() - Date.now();
      expect(delay).toBeGreaterThan(BACKOFF_BASE_MS - 1_500);
      expect(delay).toBeLessThan(BACKOFF_BASE_MS + 1_500);

      // Poll backstop picks the job up after backoff (~5s with random=1).
      const succeeded = await waitForJob(
        dbKey,
        "job-5xx",
        (j) => j.status === "succeeded",
        12_000,
      );
      expect(succeeded.attempt).toBe(2);
      expect(succeeded.result?.status_code).toBe(200);
    },
    15_000,
  );

  it("honors X-Jobs-Retry never and always via delivery", async () => {
    scripts.push({
      status: 500,
      headers: { "X-Jobs-Retry": "never" },
      body: "stop",
    });
    await createJob(dbKey, jobParams({ id: "job-never" }));
    await startRuntime();
    const dead = await waitForJob(
      dbKey,
      "job-never",
      (j) => j.status === "dead",
    );
    expect(dead.result?.terminal_reason).toBe("rejected-by-endpoint");
    await runtime!.stop();
    runtime = undefined;

    jobsDbManager.clearAllTablesForTests(dbKey);
    scripts.push({
      status: 400,
      headers: { "X-Jobs-Retry": "always" },
      body: "retry me",
    });
    await createJob(dbKey, jobParams({ id: "job-always" }));
    await startRuntime();
    const retrying = await waitForJob(
      dbKey,
      "job-always",
      (j) => j.status === "retrying",
    );
    expect(retrying.result?.status_code).toBe(400);
  });

  it("honors Retry-After on 429 for run_at scheduling", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    scripts.push({
      status: 429,
      headers: { "Retry-After": "90" },
      body: "slow",
    });
    await createJob(dbKey, jobParams({ id: "job-429" }));
    const before = Date.now();
    await startRuntime();
    const retrying = await waitForJob(
      dbKey,
      "job-429",
      (j) => j.status === "retrying",
    );
    expect(retrying.run_at.getTime()).toBeGreaterThanOrEqual(
      before + 90_000 - 2_000,
    );
  });

  it("marks auth_unresolvable as dead without retry", async () => {
    scripts.push({
      status: 401,
      body: { code: "auth_unresolvable", message: "gone" },
    });
    await createJob(dbKey, jobParams({ id: "job-auth" }));
    await startRuntime();
    const dead = await waitForJob(
      dbKey,
      "job-auth",
      (j) => j.status === "dead",
    );
    expect(dead.result?.terminal_reason).toBe("auth-unresolvable");
  });

  it("aborts at the operation timeout and schedules retry", async () => {
    scripts.push({ status: 200, delay_ms: 500, body: { too: "late" } });
    await createJob(dbKey, jobParams({ id: "job-timeout" }));
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
    expect(retrying.result?.error_body).toMatch(/timed out/i);
  });

  it("caps stored error_body at 8KB", async () => {
    const huge = "x".repeat(ERROR_BODY_CAP_BYTES + 2048);
    scripts.push({ status: 500, body: huge });
    await createJob(dbKey, jobParams({ id: "job-cap" }));
    await startRuntime();
    const retrying = await waitForJob(
      dbKey,
      "job-cap",
      (j) => j.status === "retrying",
    );
    expect(Buffer.byteLength(retrying.result?.error_body ?? "", "utf8")).toBe(
      ERROR_BODY_CAP_BYTES,
    );
  });

  it("wake claims without waiting for the poll interval", async () => {
    await startRuntime();
    const claimSpy = vi.spyOn(await import("@saflib/jobs-db"), "claimNextJob");
    claimSpy.mockClear();

    scripts.push({ status: 200, body: { ok: true } });
    await createJob(dbKey, jobParams({ id: "job-wake" }));
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
      await createJob(
        dbKey,
        jobParams({
          id: "job-stalled",
          status: "running",
          attempt: 1,
          max_attempts: 5,
          started_at: stale,
          heartbeat_at: stale,
          run_at: stale,
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

      await createJob(
        dbKey,
        jobParams({
          id: "job-short-timeout",
          operation_id: "jobsDemoWork",
          status: "running",
          attempt: 1,
          max_attempts: 5,
          started_at: shortStale,
          heartbeat_at: shortStale,
          run_at: shortStale,
        }),
      );
      await createJob(
        dbKey,
        jobParams({
          id: "job-long-timeout",
          operation_id: "jobsDemoStepC",
          status: "running",
          attempt: 1,
          max_attempts: 5,
          started_at: longStale,
          heartbeat_at: longStale,
          run_at: longStale,
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

      const { result: longJob } = await getByIdJob(dbKey, {
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
        const start = await getByIdJob(dbKey, { id: "job-hb" });
        heartbeatAtStart = start.result?.heartbeat_at;
        await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS + 300));
        const mid = await getByIdJob(dbKey, { id: "job-hb" });
        heartbeatAtAfterInterval = mid.result?.heartbeat_at;
        res.status(200).json({ ok: true });
      });
      await createJob(dbKey, jobParams({ id: "job-hb" }));
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
      await createJob(
        dbKey,
        jobParams({
          id: "job-c",
          operation_id: "jobsDemoStepC",
          enqueued_by_operation_id: "jobsDemoStepB",
          parent_job_id: "job-b",
          original_request_id: "r-chain-abc",
          run_at: now,
          created_at: now,
          updated_at: now,
        }),
      );
      signalJobsWake();
      res.status(200).json({ enqueued: "jobsDemoStepC" });
    });
    scripts.push({ status: 200, body: { done: true } });

    await createJob(
      dbKey,
      jobParams({
        id: "job-b",
        operation_id: "jobsDemoStepB",
        original_request_id: "r-chain-abc",
        enqueued_by_operation_id: "startJobsDemo",
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
    expect(jobB.operation_id).toBe("jobsDemoStepB");
    expect(jobC.operation_id).toBe("jobsDemoStepC");
    expect(jobC.parent_job_id).toBe("job-b");
    expect(jobC.original_request_id).toBe("r-chain-abc");
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
