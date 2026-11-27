import type { DbKey } from "@saflib/drizzle";
import { getByIdJob } from "@saflib/jobs-db";
import { enqueue } from "./enqueue.ts";

type Ref = { kind: "job"; id: string };

/** Same shape as `@saflib/ops-http`'s `DiagnosticProbe`. */
export interface JobsDiagnosticProbe {
  id: string;
  side: "server";
  label: string;
  what: string;
  destination: string;
  link: "jobs";
  run: (ctx: { runId: string; tag: string }) => Promise<Ref>;
  find: (ctx: { runId: string; since: Date; remembered?: { kind: string; id: string } }) => Promise<{ at: Date; ref: Ref } | null>;
}

/**
 * Diagnostics probe: enqueues a job that fails on its first attempt and is
 * never retried (`raiseTestErrorMaintenance` answers 500 with
 * `X-Jobs-Retry: never`), and reports it once the queue marks it dead.
 */
export function jobsDiagnosticProbe(options: {
  getDbKey: () => DbKey;
  operationId?: string;
}): JobsDiagnosticProbe {
  const operationId = options.operationId ?? "raiseTestErrorMaintenance";
  return {
    id: "job-failure",
    side: "server",
    label: "Failing background job",
    what: "Enqueues a job that fails once, with no retry",
    destination: "Background jobs",
    link: "jobs",
    async run({ tag }) {
      // The tag rides along as the dedupe key, so the "job went dead"
      // warning this causes is a tagged test signal (never notifies,
      // cleared with the rest).
      const { job } = await enqueue({ operation_id: operationId, request: { body: {} }, dedupe_key: tag });
      return { kind: "job", id: job.id };
    },
    async find({ remembered }) {
      if (remembered?.kind !== "job") return null;
      const { result: job } = await getByIdJob(options.getDbKey(), { id: remembered.id });
      if (!job || job.status !== "dead") return null;
      return { at: job.finished_at ?? job.updated_at, ref: { kind: "job", id: job.id } };
    },
  };
}
