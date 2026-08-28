import path from "node:path";
import { createDevSiteHttpApp } from "./http.ts";
import { startExpressServer } from "@saflib/express";
import { makeSubsystemReporters } from "@saflib/node";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import type { DevSiteHttpEnvSchema } from "./env.ts";

export type StartDevSiteServiceOptions = {
  /** Default sqlite path when DEV_SITE_DB_PATH is unset. */
  defaultDbPath?: string;
  /** Log prefix for startup messages. Defaults to dev-site-http. */
  logLabel?: string;
};

/**
 * Boot the dev-site HTTP service (API + optional SPA static) from typed env.
 * Product job trigger maps are intentionally omitted; add later if needed.
 */
export async function startDevSiteService(
  typedEnv: DevSiteHttpEnvSchema,
  options: StartDevSiteServiceOptions = {},
): Promise<void> {
  const logLabel = options.logLabel ?? "dev-site-http";
  const { log, logError } = makeSubsystemReporters("init", "main");
  try {
    log.info(`Starting ${logLabel}...`);

    const defaultDbPath =
      options.defaultDbPath ??
      path.join(process.cwd(), "data", "dev-site.sqlite");
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
      productRoot: typedEnv.DEV_SITE_PRODUCT_ROOT ?? "",
      mainRef: typedEnv.DEV_SITE_MAIN_REF || "main",
      staticDir: typedEnv.DEV_SITE_STATIC_DIR || undefined,
      githubRepo: typedEnv.DEV_SITE_GITHUB_REPO || undefined,
    });

    startExpressServer(lease.app, { port });
    log.info(`Listening on ${hostPort} (port ${port})`);
    if (!typedEnv.DEV_SITE_STATIC_DIR) {
      log.info(`${logLabel}: DEV_SITE_STATIC_DIR unset — API only`);
    }
  } catch (error) {
    logError(error);
    throw error;
  }
}
