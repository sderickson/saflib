import { startExpressServer } from "@saflib/express";
import { createBaseHttpApp } from "@saflib/base-http/http";
import { baseDb } from "@saflib/base-db/instances";
import { getBaseAuditDbKey } from "@saflib/base-audit";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "@saflib/base-service-common/context";
import { runBaseCron } from "@saflib/base-cron";
import {
  baseJobOperations,
  baseTriggerMap,
  getBaseJobsDbKey,
  runBaseJobs,
} from "@saflib/base-jobs";
import { createJobsApp, makeCronEnqueuer } from "@saflib/jobs";
import { jsonSpec } from "@saflib/base-spec";

export async function startBaseService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up base service...");
    log.info("Connecting to base-db...");
    const dbKey = baseDb.connect({ onDisk: true });
    const auditDbKey = getBaseAuditDbKey();
    const context = makeContext({ baseDbKey: dbKey, auditDbKey });
    log.info("base-db connection complete.");

    const jobsSocketPath =
      (
        typedEnv as {
          BASE_SERVICE_JOBS_SOCKET?: string;
        }
      ).BASE_SERVICE_JOBS_SOCKET ?? "/tmp/base-jobs-internal.sock";
    const internalSocketPath =
      (
        typedEnv as {
          BASE_SERVICE_INTERNAL_SOCKET?: string;
        }
      ).BASE_SERVICE_INTERNAL_SOCKET ?? "/tmp/base-internal.sock";

    log.info("Starting base-cron...");
    await runBaseCron(context, makeCronEnqueuer({ jobsSocketPath }));
    log.info("base-cron startup complete.");

    log.info("Starting base-jobs runtime...");
    await runBaseJobs(context);
    log.info("base-jobs runtime startup complete.");

    log.info("Starting base-jobs app...");
    const jobsApp = createJobsApp({
      triggerMap: baseTriggerMap,
      operationConfig: baseJobOperations,
      apiSpec: jsonSpec,
      targetSocketPath: internalSocketPath,
      dbKey: getBaseJobsDbKey(),
    });
    startExpressServer(jobsApp, { socketPath: jobsSocketPath });
    log.info("base-jobs app listening on " + jobsSocketPath);

    log.info("Starting base-http...");
    const lease = createBaseHttpApp(context);
    startExpressServer(lease.app, {
      port: parseInt(
        typedEnv.BASE_SERVICE_HTTP_HOST.split(":")[1] || "3000",
        10,
      ),
      socketPath: internalSocketPath,
    });
    log.info("base-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
