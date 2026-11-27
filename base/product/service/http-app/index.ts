import { createProductHttpApp, type HttpRouterMount } from "@saflib/express";
import { isDevelopmentDeployment } from "@saflib/env";
import type express from "express";
import type { Request } from "express";
import type { DbKey } from "@saflib/drizzle";
import { createEmailsRouter } from "@saflib/email-service";
import { createDevErrorsRouter, createErrorsRouter } from "@saflib/errors-http";
import { createKratosAdminRouter } from "@saflib/ory-kratos-http";
import { createDevLogsRouter } from "@saflib/node-log-http";
import { resolveEmailServiceFromEnv } from "@saflib/vendors-brevo";
import { baseDb, baseDbManager } from "@saflib/base-db/instances";
import { auditDb } from "@saflib/audit-db/instances";
import { jobsDb } from "@saflib/jobs-db";
import { cronDb } from "@saflib/cron-db";
import { createBaseOpsRouter, getBaseRateLimitDbPath, isOpsApiRequest } from "@saflib/base-ops";
import { createProductEventsRouter, productEventNames } from "@saflib/analytics-http";
import { jsonSpec } from "@saflib/base-spec";
import { kratosCheck, probeCheck } from "@saflib/ops-http";
import { createAuditRotationHealthCheck } from "@saflib/audit-http/express/audit-rotation-health-check";
import { auditDigestTile } from "@saflib/audit-http/express/audit-digest-tile";
import { auditDiagnosticProbe } from "@saflib/audit-http/express/audit-diagnostic-probe";
import { opsAuditSource } from "@saflib/audit-http/express/ops-audit-source";
import {
  baseAuditRecorderMiddleware,
  createBaseAuditRouter,
} from "@saflib/base-audit";
import {
  baseServiceStorage,
  type BaseServiceContextOptions,
  makeContext,
} from "@saflib/base-service-common/context";
import { createCronHealthCheck, createCronRouter, cronDigestTile } from "@saflib/cron-http";
import { baseJobs, getBaseCronDbKey } from "@saflib/base-cron";
import { createJobsHealthCheck, createJobsRouter, jobsDiagnosticProbe, jobsDigestTile } from "@saflib/jobs-http";
import { getBaseJobsDbKey } from "@saflib/base-jobs";
import { createMetricsRouter } from "@saflib/node-metrics-http";

export type { HttpRouterMount } from "@saflib/express";

export type BuildBaseHttpAppOptions = BaseServiceContextOptions & {
  /**
   * Feature routers. The composition root (`service/monolith/http.ts`) passes
   * every one; route tests pass the routers they exercise.
   */
  mounts: HttpRouterMount[];
  /**
   * Requests that skip the session gate. The composition root passes the
   * reviewed public-route list; route tests derive it from `x-public`
   * (`publicRouteMatcher`).
   */
  isPublicRoute: (req: Request) => boolean;
};

export type BaseHttpAppLease = {
  app: express.Express;
  baseDbKey: DbKey;
};

/**
 * The base service's HTTP app: {@link createProductHttpApp} with the base
 * service context, audit recorder, and the platform routers (audit, jobs,
 * cron) after the feature routers.
 */
export function buildBaseHttpApp(
  options: BuildBaseHttpAppOptions,
): BaseHttpAppLease {
  const dbKey = options.baseDbKey ?? baseDb.connect();
  const context = makeContext({
    baseDbKey: dbKey,
    ...(options.auditDbKey !== undefined
      ? { auditDbKey: options.auditDbKey }
      : {}),
  });

  const app = createProductHttpApp({
    globalMiddleware: { disableCors: true },
    runInContext: (next) => baseServiceStorage.run(context, next),
    publicRouters: [
      createErrorsRouter(),
      // Browser product events: only names declared in the spec's ProductEvent.
      createProductEventsRouter({
        allowedEvents: productEventNames(jsonSpec),
        rateLimitDbPath: getBaseRateLimitDbPath(),
      }),
      // Development-only observability routes.
      ...(isDevelopmentDeployment()
        ? [
            createDevErrorsRouter(),
            createDevLogsRouter(),
            createEmailsRouter({ emailService: resolveEmailServiceFromEnv() }),
            createMetricsRouter(),
          ]
        : []),
    ],
    isPublicRoute: options.isPublicRoute,
    // The ops API authenticates by ops token, not session (see @saflib/ops-http).
    deferAuth: isOpsApiRequest,
    afterAuth: [baseAuditRecorderMiddleware()],
    mounts: options.mounts,
    platformRouters: [
      createBaseOpsRouter({
        healthChecks: [
          probeCheck("base-db", async () => {
            baseDbManager.get(dbKey)!.$client.prepare("select 1").get();
          }),
          createAuditRotationHealthCheck({ getAuditDbKey: () => context.auditDbKey }),
          createJobsHealthCheck({ getDbKey: getBaseJobsDbKey }),
          createCronHealthCheck({ getDbKey: getBaseCronDbKey }),
          kratosCheck(),
        ],
        // Overview tiles beyond the ops API's own; add the product's
        // customer queues here too.
        digestTiles: [
          jobsDigestTile({ getDbKey: getBaseJobsDbKey }),
          cronDigestTile({ getDbKey: getBaseCronDbKey, jobs: baseJobs }),
          auditDigestTile({ getAuditDbKey: () => context.auditDbKey }),
        ],
        // Self-test probes beyond the ops API's own: a job that fails on
        // purpose (allowed in base-jobs' trigger map) and an audit event.
        diagnosticProbes: [
          jobsDiagnosticProbe({ getDbKey: getBaseJobsDbKey }),
          auditDiagnosticProbe({ getAuditDbKey: () => context.auditDbKey }),
        ],
        // Sign-ins, account changes and admin actions for agents (GET /ops/audit).
        audit: opsAuditSource({ getAuditDbKey: () => context.auditDbKey }),
        // App-managed backups (ops and Kratos are added by base-ops).
        backupDatabases: [
          { name: "main", path: () => baseDb.getDbPath(dbKey) ?? null },
          { name: "audit", path: () => auditDb.getDbPath(context.auditDbKey) ?? null },
          { name: "jobs", path: () => jobsDb.getDbPath(getBaseJobsDbKey()) ?? null },
          { name: "cron", path: () => cronDb.getDbPath(getBaseCronDbKey()) ?? null },
        ],
      }),
      createBaseAuditRouter(),
      // Site-admin identity routes (UserRef lookups, Users page). Pass
      // resolveProfiles to show names; Kratos traits only hold the email.
      createKratosAdminRouter(),
      createJobsRouter({ dbKey: getBaseJobsDbKey() }),
      createCronRouter({
        dbKey: getBaseCronDbKey(),
        jobs: baseJobs,
        // Ticks enqueue via runBaseCron in the monolith; the router is admin-only.
        enqueueJob: async () => ({}),
      }),
    ],
  });

  return { app, baseDbKey: dbKey };
}
