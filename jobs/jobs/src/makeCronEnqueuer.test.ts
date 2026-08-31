import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
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
import { asOpenApiDocument } from "@saflib/openapi";
import type { DbKey } from "@saflib/drizzle";
import { startExpressServer } from "@saflib/express";
import { jobsDbManager } from "@saflib/jobs-db/instances";

import { createJobsApp } from "./createJobsApp.ts";
import { makeCronEnqueuer } from "./makeCronEnqueuer.ts";
import { _resetJobsWakeForTests } from "./runJobs.ts";

import { getByIdJob } from "@saflib/jobs-db";
const TEST_SECRET = Buffer.from("cron-enqueuer-test-secret!!!!").toString(
  "base64",
);
const TEST_KEYS = `cron-enq:${TEST_SECRET}`;

const productSpec = asOpenApiDocument({
  openapi: "3.1.0",
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
});

const triggerMap = {
  "cron:purgeClaudeFiles": ["purgeClaudeFilesMaintenance"],
} as const;

async function waitForListening(server: http.Server): Promise<void> {
  if (!server.listening) {
    await once(server, "listening");
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
}

/** Minimal Kratos admin fake so assertion auth can resolve identities. */
function startFakeKratos(identities: Map<string, { email: string }>): Promise<{
  server: http.Server;
  baseUrl: string;
}> {
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

describe("makeCronEnqueuer", () => {
  let dbKey: DbKey;
  let socketPath: string;
  let closeServer: (() => Promise<void>) | undefined;
  let kratosServer: http.Server | undefined;
  let kratosBaseUrl: string;
  const identities = new Map<string, { email: string }>();

  beforeAll(async () => {
    const kratos = await startFakeKratos(identities);
    kratosServer = kratos.server;
    kratosBaseUrl = kratos.baseUrl;

    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", TEST_KEYS);
    vi.stubEnv("KRATOS_ADMIN_API_URL", kratosBaseUrl);
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    identities.set("admin-enabled-by", { email: "admin@example.com" });

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
    vi.stubEnv("KRATOS_ADMIN_API_URL", kratosBaseUrl);
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    jobsDbManager.clearAllTablesForTests(dbKey);
    _resetJobsWakeForTests();
  });

  afterEach(() => {
    _resetJobsWakeForTests();
  });

  afterAll(async () => {
    await closeServer?.();
    if (socketPath && fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }
    kratosServer?.close();
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
      operation_id: "purgeClaudeFilesMaintenance",
      user_id: "admin-enabled-by",
      original_request_id: "tick-req-1",
      enqueued_by_operation_id: "cron:purgeClaudeFiles",
      dedupe_key: "cron:purgeClaudeFiles",
      authority: {
        kind: "cron",
        user_id: "admin-enabled-by",
        cron_job_name: "purgeClaudeFiles",
      },
    });

    const { result: stored } = await getByIdJob(dbKey, {
      id: result.job.id,
    });
    expect(stored?.authority).toMatchObject({
      kind: "cron",
      user_id: "admin-enabled-by",
      cron_job_name: "purgeClaudeFiles",
    });

    const assertionPayload = JSON.parse(
      Buffer.from(stored!.authority.assertion.payload, "base64url").toString(
        "utf8",
      ),
    ) as {
      userId: string;
      requestId?: string;
      mfaCompleted?: boolean;
      claims?: Record<string, string>;
    };
    expect(assertionPayload.userId).toBe("admin-enabled-by");
    expect(assertionPayload.requestId).toBe("tick-req-1");
    expect(assertionPayload.mfaCompleted).toBe(true);
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
