#!/usr/bin/env node
// TODO: Uncomment the imports and code below and update as needed

// import { startExpressServer } from "@saflib/express";
// import { createApiApp } from "@your-org/template-file-http";
// import { mainDb } from "@your-org/template-file-db";
import {
  addLokiTransport,
  collectSystemMetrics,
  makeSubsystemReporters,
} from "@saflib/node";
import { setServiceName } from "@saflib/node";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
// import { typedEnv } from "../env.ts";

validateEnv(process.env, envSchema);
setServiceName("template-file");
addLokiTransport();
collectSystemMetrics();

async function main() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up API server...");
    log.info("Connecting to template-file-db...");
    // const dbKey = mainDb.connect({ onDisk: true, doNotCreate: true });
    log.info("template-file-db connection complete.");

    log.info("Starting template-file-http...");
    // const expressApp = createApiApp({ mainDbKey: dbKey });
    // startExpressServer(expressApp, {
    // port: (parseInt(typedEnv.TEMPLATE_FILE_SERVICE_HTTP_PORT || "3000", 10),
    // });
    log.info("template-file-http startup complete.");
  } catch (error) {
    logError(error);
  }
}

main();
