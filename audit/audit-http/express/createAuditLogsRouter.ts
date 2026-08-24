import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as sealAuditLogOperationJsonSpec } from "@saflib/audit-spec/operations/sealAuditLog";
import type { DbKey } from "@saflib/drizzle";
import type { AuditSealResult } from "@saflib/audit-db/seal-types";
import type { Request, Response } from "express";
import { createListAuditLogsHandler } from "./list-audit-logs.ts";
import { createSealAuditLogHandler } from "./seal-audit-log.ts";
import { operationJsonSpec as listAuditLogsOperationJsonSpec } from "@saflib/audit-spec/operations/listAuditLogs";

export type CreateAuditLogsRouterOptions = {
  getAuditDbKey: () => DbKey;
  /** When set, mounts `POST /audit-logs/seal`. */
  sealAuditLog?: (triggeredBy: {
    userId: string;
    requestId: string;
  }) => Promise<AuditSealResult>;
  appendFailClosedHttpAuditIfRequired?: (
    req: Request,
    res: Response,
    meta: { responseStatusCode: number },
  ) => Promise<void>;
};

/** Site-admin audit log browse + optional seal. */
export function createAuditLogsRouter(
  options: CreateAuditLogsRouterOptions,
): Router {
  const router = Router();

  router.get(
    "/audit-logs",
    ...createOperationScopedMiddleware(listAuditLogsOperationJsonSpec),
    createListAuditLogsHandler({ getAuditDbKey: options.getAuditDbKey }),
  );

  if (options.sealAuditLog) {
    router.post(
      "/audit-logs/seal",
      ...createOperationScopedMiddleware(sealAuditLogOperationJsonSpec),
      createSealAuditLogHandler({
        sealAuditLog: options.sealAuditLog,
        appendFailClosedHttpAuditIfRequired:
          options.appendFailClosedHttpAuditIfRequired,
      }),
    );
  }

  return router;
}

/** @deprecated Use {@link createAuditLogsRouter}. */
export function createAuditRouter(options: {
  getAuditDbKey: () => DbKey;
}): Router {
  return createAuditLogsRouter(options);
}
