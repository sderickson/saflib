#!/usr/bin/env node

import { startExpressServer } from "@saflib/express";
import { createTemplateFileHttpApp } from "@template/file-http";
import { templateFileDb } from "@template/file-db";
import {
  addLokiTransport,
  collectSystemMetrics,
  makeSubsystemReporters,
} from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { typedEnv } from "./env.ts";
import { makeContext } from "@template/file-service-common";

validateEnv(process.env, envSchema);
setServiceName("template-file");
addLokiTransport();
collectSystemMetrics();

async function main() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up TemplateFile service...");
    log.info("Connecting to template-file-db...");
    const dbKey = templateFileDb.connect({ onDisk: true, doNotCreate: true });
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

main();
