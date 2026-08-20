import { startExpressServer } from "@saflib/express";
import { createBaseHttpApp } from "@saflib/base-http/http";
import { baseDb } from "@saflib/base-db/instances";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "@saflib/base-service-common/context";
import { runBaseCron } from "@saflib/base-cron";

export function startBaseService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up base service...");
    log.info("Connecting to base-db...");
    const dbKey = baseDb.connect({ onDisk: true });
    const context = makeContext({ baseDbKey: dbKey });
    log.info("base-db connection complete.");

    log.info("Starting base-cron...");
    // BEGIN WORKFLOW AREA run-cron FOR cron/init
    // Without @saflib/jobs in the golden product, ticks no-op enqueue.
    // Products with jobs should pass makeCronEnqueuer({ jobsSocketPath }).
    void runBaseCron(context, async () => ({}));
    // END WORKFLOW AREA
    log.info("base-cron startup complete.");

    log.info("Starting base-http...");
    const lease = createBaseHttpApp(context);
    startExpressServer(lease.app, {
      port: parseInt(
        typedEnv.BASE_SERVICE_HTTP_HOST.split(":")[1] || "3000",
        10,
      ),
    });
    log.info("base-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
