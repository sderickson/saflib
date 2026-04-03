import { startExpressServer } from "@saflib/express";
import { create__ServiceName__HttpApp } from "template-package-http";
import { __serviceName__Db } from "template-package-db";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { initializeDependencies } from "template-package-service-common";

export async function start__ServiceName__Service() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up __service-name__ service...");

    log.info("Initializing dependencies...");
    await initializeDependencies();
    log.info("Dependencies initialized.");

    log.info("Connecting to __service-name__-db...");
    const dbKey = __serviceName__Db.connect({ onDisk: true });
    log.info("__service-name__-db connection complete.");

    log.info("Starting __service-name__-http...");
    const expressApp = create__ServiceName__HttpApp({ __serviceName__DbKey: dbKey });
    startExpressServer(expressApp, {
      port: parseInt(
        typedEnv.__SERVICE_NAME___SERVICE_HTTP_HOST.split(":")[1] || "3000",
        10,
      ),
    });
    log.info("__service-name__-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
