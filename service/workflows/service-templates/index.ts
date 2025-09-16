import { startExpressServer } from "@saflib/express";
import { createTemplateFileHttpApp } from "@template/file-http";
import { templateFileDb } from "@template/file-db";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "@template/file-service-common";

export function startTemplateFileService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up TemplateFile service...");
    log.info("Connecting to template-file-db...");
    const dbKey = templateFileDb.connect({ onDisk: true });
    const context = makeContext({ templateFileDbKey: dbKey });
    log.info("template-file-db connection complete.");

    log.info("Starting template-file-http...");
    const expressApp = createTemplateFileHttpApp(context);
    startExpressServer(expressApp, {
      port: parseInt(typedEnv.TEMPLATE_FILE_SERVICE_HTTP_PORT || "3000", 10),
    });
    log.info("template-file-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
