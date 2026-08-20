import { startExpressServer } from "@saflib/express";
import { createTemplatesHttpApp } from "@saflib/templates-http/http";
import { templatesDb } from "@saflib/templates-db/instances";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "@saflib/templates-service-common/context";

export function startTemplatesService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up templates service...");
    log.info("Connecting to templates-db...");
    const dbKey = templatesDb.connect({ onDisk: true });
    const context = makeContext({ templatesDbKey: dbKey });
    log.info("templates-db connection complete.");

    log.info("Starting templates-http...");
    const lease = createTemplatesHttpApp(context);
    startExpressServer(lease.app, {
      port: parseInt(
        typedEnv.TEMPLATES_SERVICE_HTTP_HOST.split(":")[1] || "3000",
        10,
      ),
    });
    log.info("templates-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
