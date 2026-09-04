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
} from "@saflib/jobs-spec";
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
    key_id: parts[2],
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
  if (!allowed.includes(data.operation_id)) {
    observeJobsEnqueued(data.operation_id, "rejected");
    throw createError(
      403,
      `Operation "${callingOperationId}" may not enqueue "${data.operation_id}"`,
      { code: "trigger_map_violation" },
    );
  }

  const resolved = ctx.operations.get(data.operation_id);
  if (!resolved || !resolved.isBackground) {
    observeJobsEnqueued(data.operation_id, "rejected");
    throw createError(
      422,
      resolved
        ? `Operation "${data.operation_id}" is not tagged background`
        : `Unknown operation_id "${data.operation_id}"`,
      { code: "invalid_operation" },
    );
  }

  const request: JobRequest = data.request ?? {};
  const requestJson = JSON.stringify(request);
  if (Buffer.byteLength(requestJson, "utf8") > REQUEST_SIZE_CAP_BYTES) {
    observeJobsEnqueued(data.operation_id, "rejected");
    throw createError(400, "Job request exceeds 16 KB size cap", {
      code: "request_too_large",
    });
  }

  const assertionEvidence = parseAssertionToken(assertionHeader);
  const actingUserId = data.on_behalf_of?.user_id ?? auth.userId!;
  const chainRootId =
    assertion.claims?.originalRequestId ??
    originalRequestId ??
    requestId ??
    "no-request-id";

  let authority: JobAuthority;
  if (data.on_behalf_of) {
    const evidence = data.on_behalf_of.authority;
    if (evidence.kind === "request") {
      authority = {
        kind: "request",
        user_id: data.on_behalf_of.user_id,
        request_id: evidence.request_id,
        assertion: assertionEvidence,
      };
    } else if (evidence.kind === "resource") {
      authority = {
        kind: "resource",
        user_id: data.on_behalf_of.user_id,
        resource_id: evidence.resource_id,
        assertion: assertionEvidence,
      };
    } else if (evidence.kind === "cron") {
      authority = {
        kind: "cron",
        user_id: data.on_behalf_of.user_id,
        cron_job_name: evidence.cron_job_name,
        assertion: assertionEvidence,
      };
    } else {
      throw createError(400, "on_behalf_of.authority requires evidence", {
        code: "invalid_authority",
      });
    }
  } else {
    authority = {
      kind: "request",
      user_id: actingUserId,
      request_id: chainRootId,
      assertion: assertionEvidence,
    };
  }

  const now = new Date();
  let run_at = now;
  if (data.delay_ms != null) {
    run_at = new Date(now.getTime() + data.delay_ms);
  } else if (data.run_at) {
    run_at = new Date(data.run_at);
  }

  const max_attempts =
    ctx.operationConfig[data.operation_id]?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const parent_job_id = assertion.claims?.jobId ?? null;

  const { result, error } = await createJob(ctx.dbKey, {
    status: "pending",
    operation_id: data.operation_id,
    request,
    user_id: actingUserId,
    authority,
    original_request_id: chainRootId,
    enqueued_by_operation_id: callingOperationId,
    parent_job_id,
    run_at,
    dedupe_key: data.dedupe_key ?? null,
    concurrency_key: data.concurrency_key ?? null,
    priority: data.priority ?? 0,
    attempt: 0,
    max_attempts,
    heartbeat_at: null,
    result: null,
    created_at: now,
    updated_at: now,
    started_at: null,
    finished_at: null,
    spawnCap: SPAWN_CAP,
  });

  if (error) {
    switch (true) {
      case error instanceof JobSpawnCapExceededError:
        observeJobsEnqueued(data.operation_id, "rejected");
        throw createError(429, "Spawn cap exceeded for this original_request_id", {
          code: "spawn_cap_exceeded",
        });
      default:
        throw error satisfies never;
    }
  }

  observeJobsEnqueued(
    data.operation_id,
    result!.deduped ? "deduped" : "created",
  );
  signalJobsWake();

  const response: JobsServiceResponseBody["enqueueJob"][201] = {
    job: mapJobToWire(result!.job),
  };

  res.status(result!.deduped ? 200 : 201).json(response);
});
