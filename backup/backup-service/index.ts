import { startExpressServer } from "@saflib/express";
import { createBackupHttpApp } from "@saflib/backup-http";
import { backupDb } from "@saflib/backup-db";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { makeContext } from "@saflib/backup-service-common";

export function startBackupService() {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting up backup service...");
    log.info("Connecting to backup-db...");
    const dbKey = backupDb.connect({ onDisk: true });
    const context = makeContext({ backupDbKey: dbKey });
    log.info("backup-db connection complete.");

    log.info("Starting backup-http...");
    const expressApp = createBackupHttpApp(context);
    startExpressServer(expressApp, {
      port: parseInt(typedEnv.BACKUP_SERVICE_HTTP_PORT || "3000", 10),
    });
    log.info("backup-http startup complete.");
  } catch (error) {
    logError(error);
  }
}
