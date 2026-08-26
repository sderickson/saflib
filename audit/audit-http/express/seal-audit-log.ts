import type { Handler, Request, Response } from "express";
import { createHandler } from "./handler.ts";
import type { AuditSealResult } from "@saflib/audit-db/seal-types";
import { getSafContextWithAuth, getSafReporters } from "@saflib/node";
import {
  auditSealResultToJsonBody,
  mapSealPipelineErrorTo500,
} from "./seal-audit-log-helpers.ts";

export type CreateSealAuditLogHandlerOptions = {
  sealAuditLog: (triggeredBy: {
    userId: string;
    requestId: string;
  }) => Promise<AuditSealResult>;
  appendFailClosedHttpAuditIfRequired?: (
    req: Request,
    res: Response,
    meta: { responseStatusCode: number },
  ) => Promise<void>;
};

export function createSealAuditLogHandler(
  options: CreateSealAuditLogHandlerOptions,
): Handler {
  return createHandler(async (req, res) => {
    const { auth, requestId } = getSafContextWithAuth();

    try {
      const result = await options.sealAuditLog({
        userId: auth.userId,
        requestId: requestId ?? "unknown",
      });

      const body = auditSealResultToJsonBody(result);
      const status = result.status === "sealed" ? 200 : 409;
      res.status(status);

      await options.appendFailClosedHttpAuditIfRequired?.(req, res, {
        responseStatusCode: status,
      });

      res.json(body);
    } catch (err) {
      const { logError } = getSafReporters();
      logError(err instanceof Error ? err : new Error(String(err)));
      res.status(500).json(mapSealPipelineErrorTo500(err));
    }
  });
}
