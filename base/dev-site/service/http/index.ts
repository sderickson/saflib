import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDevSiteHttpApp } from "@saflib/dev-site-http/http";
import { startExpressServer } from "@saflib/express";
import { makeSubsystemReporters } from "@saflib/node";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { baseTriggerMap } from "@saflib/base-jobs";
import { typedEnv } from "./env.ts";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(packageDir, "data", "dev-site.sqlite");

/**
 * Boot the base product's dev-site HTTP service (API + optional SPA static).
 */
export async function startDevSiteService(): Promise<void> {
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info("Starting base-dev-site-http...");

    const dbPath = typedEnv.DEV_SITE_DB_PATH || defaultDbPath;
    const dbKey = devSiteDb.connect({
      onDisk: dbPath,
      pragmas: {
        journal_mode: "WAL",
        busy_timeout: 5000,
      },
    });
    log.info(`Connected to sqlite at ${dbPath}`);

    const hostPort = typedEnv.DEV_SITE_SERVICE_HTTP_HOST || "0.0.0.0:3099";
    const port = parseInt(hostPort.split(":").pop() || "3099", 10);

    const lease = createDevSiteHttpApp({
      devSiteDbKey: dbKey,
      repoRoot: typedEnv.DEV_SITE_REPO_ROOT || process.cwd(),
      productRoot: typedEnv.DEV_SITE_PRODUCT_ROOT ?? "base",
      mainRef: typedEnv.DEV_SITE_MAIN_REF || "main",
      staticDir: typedEnv.DEV_SITE_STATIC_DIR || undefined,
      jobTriggerMap: baseTriggerMap,
    });

    startExpressServer(lease.app, { port });
    log.info(`Listening on ${hostPort} (port ${port})`);
    if (!typedEnv.DEV_SITE_STATIC_DIR) {
      log.info(
        "DEV_SITE_STATIC_DIR unset — API only. Live-dev UI is http://localhost:5199/",
      );
    }
  } catch (error) {
    logError(error);
    throw error;
  }
}
