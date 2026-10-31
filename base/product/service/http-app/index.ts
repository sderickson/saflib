import { createProductHttpApp, type HttpRouterMount } from "@saflib/express";
import { isDevelopmentDeployment } from "@saflib/env";
import type express from "express";
import type { Request } from "express";
import type { DbKey } from "@saflib/drizzle";
import { createEmailsRouter } from "@saflib/email-service";
import { createDevErrorsRouter, createErrorsRouter } from "@saflib/errors-http";
import { createDevAnalyticsRouter } from "@saflib/analytics-http";
import { createDevLogsRouter } from "@saflib/node-log-http";
import { resolveEmailServiceFromEnv } from "@saflib/vendors-brevo";
import { baseDb } from "@saflib/base-db/instances";
import {
  baseAuditRecorderMiddleware,
  createBaseAuditRouter,
} from "@saflib/base-audit";
import {
  baseServiceStorage,
  type BaseServiceContextOptions,
  makeContext,
} from "@saflib/base-service-common/context";
import { createCronRouter } from "@saflib/cron-http";
import { baseJobs, getBaseCronDbKey } from "@saflib/base-cron";
import { createJobsRouter } from "@saflib/jobs-http";
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
      // Development-only observability routes.
      ...(isDevelopmentDeployment()
        ? [
            createDevErrorsRouter(),
            createDevLogsRouter(),
            createDevAnalyticsRouter(),
            createEmailsRouter({ emailService: resolveEmailServiceFromEnv() }),
            createMetricsRouter(),
          ]
        : []),
    ],
    isPublicRoute: options.isPublicRoute,
    afterAuth: [baseAuditRecorderMiddleware()],
    mounts: options.mounts,
    platformRouters: [
      createBaseAuditRouter(),
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
