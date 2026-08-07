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
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import type { DbKey } from "@saflib/drizzle";
import { startExpressServer } from "@saflib/express";
import * as oryKratos from "@saflib/ory-kratos";
import { jobsDbManager } from "@saflib/jobs-db/instances";
import { jobQueries } from "@saflib/jobs-db";
import { createJobsApp } from "./createJobsApp.ts";
import { makeCronEnqueuer } from "./makeCronEnqueuer.ts";
import { _resetJobsWakeForTests } from "./runJobs.ts";

const TEST_SECRET = Buffer.from("cron-enqueuer-test-secret!!!!").toString(
  "base64",
);
const TEST_KEYS = `cron-enq:${TEST_SECRET}`;

const productSpec: OpenAPIV3.DocumentV3 = {
  openapi: "3.0.0",
  info: { title: "product", version: "1.0.0" },
  paths: {
    "/maintenance/purge-claude-files": {
      post: {
        operationId: "purgeClaudeFilesMaintenance",
        tags: ["background", "site-admin-only"],
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

const triggerMap = {
  "cron:purgeClaudeFiles": ["purgeClaudeFilesMaintenance"],
} as const;

async function waitForListening(server: http.Server): Promise<void> {
  if (!server.listening) {
    await once(server, "listening");
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("makeCronEnqueuer", () => {
  let dbKey: DbKey;
  let socketPath: string;
  let closeServer: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", TEST_KEYS);
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    dbKey = jobsDbManager.connect();
    socketPath = path.join(os.tmpdir(), `jc${process.pid}.sock`);
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }

    const jobsApp = createJobsApp({
      triggerMap,
      apiSpec: productSpec,
      targetSocketPath: "/tmp/unused-target.sock",
      dbKey,
    });
    const started = startExpressServer(jobsApp, { socketPath });
    closeServer = started.close;
    await waitForListening(started.internalServer!);
  });

  beforeEach(() => {
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", TEST_KEYS);
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    jobsDbManager.clearAllTablesForTests(dbKey);
    _resetJobsWakeForTests();
    vi.spyOn(oryKratos, "resolveAuthFromIdentityId").mockImplementation(
      async (userId) => ({
        userId,
        userEmail: "admin@example.com",
        isAdmin: true,
        emailVerified: true,
      }),
    );
  });

  afterEach(() => {
    _resetJobsWakeForTests();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeServer?.();
    if (socketPath && fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }
    jobsDbManager.disconnect(dbKey);
    vi.unstubAllEnvs();
  });

  it("enqueues with cron authority and cron:{jobName} assertion claims", async () => {
    const enqueueJob = makeCronEnqueuer({ jobsSocketPath: socketPath });

    const result = await enqueueJob({
      jobName: "purgeClaudeFiles",
      enabledBy: "admin-enabled-by",
      operationId: "purgeClaudeFilesMaintenance",
      request: {},
      requestId: "tick-req-1",
    });

    expect(result.deduped).toBe(false);
    expect(result.job).toMatchObject({
      operationId: "purgeClaudeFilesMaintenance",
      userId: "admin-enabled-by",
      originalRequestId: "tick-req-1",
      enqueuedByOperationId: "cron:purgeClaudeFiles",
      dedupeKey: "cron:purgeClaudeFiles",
      authority: {
        kind: "cron",
        userId: "admin-enabled-by",
        cronJobName: "purgeClaudeFiles",
      },
    });

    const { result: stored } = await jobQueries.getByIdJob(dbKey, {
      id: result.job.id,
    });
    expect(stored?.authority).toMatchObject({
      kind: "cron",
      userId: "admin-enabled-by",
      cronJobName: "purgeClaudeFiles",
    });

    const assertionPayload = JSON.parse(
      Buffer.from(stored!.authority.assertion.payload, "base64url").toString(
        "utf8",
      ),
    ) as {
      userId: string;
      requestId?: string;
      claims?: Record<string, string>;
    };
    expect(assertionPayload.userId).toBe("admin-enabled-by");
    expect(assertionPayload.requestId).toBe("tick-req-1");
    expect(assertionPayload.claims).toMatchObject({
      callingOperationId: "cron:purgeClaudeFiles",
      originalRequestId: "tick-req-1",
    });
  });

  it("rejects when cron job is not in the trigger map", async () => {
    const enqueueJob = makeCronEnqueuer({ jobsSocketPath: socketPath });

    await expect(
      enqueueJob({
        jobName: "notRegistered",
        enabledBy: "admin-enabled-by",
        operationId: "purgeClaudeFilesMaintenance",
        requestId: "tick-req-2",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
