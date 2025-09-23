import { startExpressServer } from "@saflib/express";
import { create__ServiceName__HttpApp } from "template-package-http";
import { __serviceName__Db } from "template-package-db";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "template-package-service-common";

export function start__ServiceName__Service() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up __service-name__ service...");
    log.info("Connecting to __service-name__-db...");
    const dbKey = __serviceName__Db.connect({ onDisk: true });
    const context = makeContext({ __serviceName__DbKey: dbKey });
    log.info("__service-name__-db connection complete.");

    log.info("Starting __service-name__-http...");
    const expressApp = create__ServiceName__HttpApp(context);
    startExpressServer(expressApp, {
      port: parseInt(typedEnv.__SERVICE_NAME___SERVICE_HTTP_PORT || "3000", 10),
    });
    log.info("__service-name__-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
