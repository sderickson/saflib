import { createHandler } from "@saflib/express";
import createError from "http-errors";
import {
  getSafContextWithAuth,
  verifyAssertion,
} from "@saflib/node";
import { JobSpawnCapExceededError, createJob } from "@saflib/jobs-db";
import type { JobAuthority, JobAuthorityAssertion, JobRequest } from "@saflib/jobs-db";
import type {
  JobsServiceRequestBody,
  JobsServiceResponseBody,
} from "jobs-spec";
import { DEFAULT_MAX_ATTEMPTS, REQUEST_SIZE_CAP_BYTES, SPAWN_CAP } from "../../src/constants.ts";
import { jobsServiceStorage } from "../../src/context.ts";
import { mapJobToWire } from "../../src/mapJob.ts";
import { observeJobsEnqueued } from "../../src/metrics.ts";
import { signalJobsWake } from "../../src/runJobs.ts";

function parseAssertionToken(token: string): JobAuthorityAssertion {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw createError(401, "Invalid identity assertion", {
      code: "assertion_invalid",
    });
  }
  return {
    payload: parts[0],
    signature: parts[1],
    keyId: parts[2],
  };
}

export const enqueueJobHandler = createHandler(async (req, res) => {
  const ctx = jobsServiceStorage.getStore()!;
  const { auth, requestId, originalRequestId } = getSafContextWithAuth();

  const data: JobsServiceRequestBody["enqueueJob"] = req.body;

  const assertionHeader = req.headers["x-saf-identity-assertion"];
  if (typeof assertionHeader !== "string" || assertionHeader.length === 0) {
    throw createError(401, "Missing identity assertion", {
      code: "assertion_invalid",
    });
  }

  const assertion = verifyAssertion(assertionHeader);
  const callingOperationId = assertion.claims?.callingOperationId;
  if (!callingOperationId) {
    throw createError(403, "Missing callingOperationId claim", {
      code: "trigger_map_violation",
    });
  }

  const allowed = ctx.triggerMap[callingOperationId] ?? [];
  if (!allowed.includes(data.operationId)) {
    observeJobsEnqueued(data.operationId, "rejected");
    throw createError(
      403,
      `Operation "${callingOperationId}" may not enqueue "${data.operationId}"`,
      { code: "trigger_map_violation" },
    );
  }

  const resolved = ctx.operations.get(data.operationId);
  if (!resolved || !resolved.isBackground) {
    observeJobsEnqueued(data.operationId, "rejected");
    throw createError(
      422,
      resolved
        ? `Operation "${data.operationId}" is not tagged background`
        : `Unknown operationId "${data.operationId}"`,
      { code: "invalid_operation" },
    );
  }

  const request: JobRequest = data.request ?? {};
  const requestJson = JSON.stringify(request);
  if (Buffer.byteLength(requestJson, "utf8") > REQUEST_SIZE_CAP_BYTES) {
    observeJobsEnqueued(data.operationId, "rejected");
    throw createError(400, "Job request exceeds 16 KB size cap", {
      code: "request_too_large",
    });
  }

  const assertionEvidence = parseAssertionToken(assertionHeader);
  const actingUserId = data.onBehalfOf?.userId ?? auth.userId!;
  const chainRootId =
    assertion.claims?.originalRequestId ??
    originalRequestId ??
    requestId ??
    "no-request-id";

  let authority: JobAuthority;
  if (data.onBehalfOf) {
    const evidence = data.onBehalfOf.authority;
    if (evidence.kind === "request") {
      authority = {
        kind: "request",
        userId: data.onBehalfOf.userId,
        requestId: evidence.requestId,
        assertion: assertionEvidence,
      };
    } else if (evidence.kind === "importer") {
      authority = {
        kind: "importer",
        userId: data.onBehalfOf.userId,
        importerId: evidence.importerId,
        assertion: assertionEvidence,
      };
    } else if (evidence.kind === "cron") {
      authority = {
        kind: "cron",
        userId: data.onBehalfOf.userId,
        cronJobName: evidence.cronJobName,
        assertion: assertionEvidence,
      };
    } else {
      throw createError(400, "onBehalfOf.authority requires evidence", {
        code: "invalid_authority",
      });
    }
  } else {
    authority = {
      kind: "request",
      userId: actingUserId,
      requestId: chainRootId,
      assertion: assertionEvidence,
    };
  }

  const now = new Date();
  let runAt = now;
  if (data.delayMs != null) {
    runAt = new Date(now.getTime() + data.delayMs);
  } else if (data.runAt) {
    runAt = new Date(data.runAt);
  }

  const maxAttempts =
    ctx.operationConfig[data.operationId]?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const parentJobId = assertion.claims?.jobId ?? null;

  const { result, error } = await createJob(ctx.dbKey, {
    status: "pending",
    operationId: data.operationId,
    request,
    userId: actingUserId,
    authority,
    originalRequestId: chainRootId,
    enqueuedByOperationId: callingOperationId,
    parentJobId,
    runAt,
    dedupeKey: data.dedupeKey ?? null,
    concurrencyKey: data.concurrencyKey ?? null,
    priority: data.priority ?? 0,
    attempt: 0,
    maxAttempts,
    heartbeatAt: null,
    result: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    spawnCap: SPAWN_CAP,
  });

  if (error) {
    switch (true) {
      case error instanceof JobSpawnCapExceededError:
        observeJobsEnqueued(data.operationId, "rejected");
        throw createError(429, "Spawn cap exceeded for this originalRequestId", {
          code: "spawn_cap_exceeded",
        });
      default:
        throw error satisfies never;
    }
  }

  observeJobsEnqueued(
    data.operationId,
    result!.deduped ? "deduped" : "created",
  );
  signalJobsWake();

  const response: JobsServiceResponseBody["enqueueJob"][201] = {
    job: mapJobToWire(result!.job),
  };

  res.status(result!.deduped ? 200 : 201).json(response);
});
