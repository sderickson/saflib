import { startExpressServer } from "@saflib/express";
import { createTmpHttpApp } from "tmp-http";
import { tmpDb } from "tmp-db";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "tmp-service-common";

export function startTmpService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up tmp service...");
    log.info("Connecting to tmp-db...");
    const dbKey = tmpDb.connect({ onDisk: true });
    const context = makeContext({ tmpDbKey: dbKey });
    log.info("tmp-db connection complete.");

    log.info("Starting tmp-http...");
    const expressApp = createTmpHttpApp(context);
    startExpressServer(expressApp, {
      port: parseInt(typedEnv.TMP_SERVICE_HTTP_PORT || "3000", 10),
    });
    log.info("tmp-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
