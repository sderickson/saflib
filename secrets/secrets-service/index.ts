import { startExpressServer } from "@saflib/express";
import { createSecretsHttpApp } from "@saflib/secrets-http";
import { secretsDb } from "@saflib/secrets-db";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "@saflib/secrets-service-common";

export function startSecretsService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up Secrets service...");
    log.info("Connecting to secrets-db...");
    const dbKey = secretsDb.connect({ onDisk: true });
    const context = makeContext({ secretsDbKey: dbKey });
    log.info("secrets-db connection complete.");

    log.info("Starting secrets-http...");
    const expressApp = createSecretsHttpApp(context);
    startExpressServer(expressApp, {
      port: parseInt(typedEnv.SECRETS_SERVICE_HTTP_PORT || "3000", 10),
    });
    log.info("secrets-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
