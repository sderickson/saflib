import type { Handler, Request } from "express";
import type { ChangeEmitter } from "@saflib/notify";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface CreateChangeEventMiddlewareOptions {
  /** Publishes change hints for org SSE subscribers. */
  emitter: ChangeEmitter;
  /**
   * Resolve the org channel for this request.
   * Return undefined/null/empty to skip publishing.
   */
  getOrgId: (req: Request) => string | undefined | null;
  /** operationIds that should never publish (e.g. noisy CSP reports). */
  skipOperationIds?: ReadonlySet<string> | readonly string[];
}

function toStringParams(
  params: Request["params"],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    out[key] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return out;
}

/**
 * After a successful non-read response, publish a ChangeEvent for the org.
 * Mount after OpenAPI binding so `req.openapi.schema.operationId` is set.
 * Covers both foreground requests and internal job deliveries on the same app.
 */
export const createChangeEventMiddleware = (
  options: CreateChangeEventMiddlewareOptions,
): Handler => {
  const { emitter, getOrgId } = options;
  const skipOperationIds = options.skipOperationIds
    ? new Set(options.skipOperationIds)
    : undefined;

  return (req, res, next) => {
    res.on("finish", () => {
      const method = (req.method ?? "").toUpperCase();
      if (SAFE_METHODS.has(method)) {
        return;
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      const operationId = req.openapi?.schema?.operationId;
      if (!operationId || skipOperationIds?.has(operationId)) {
        return;
      }

      const orgId = getOrgId(req);
      if (!orgId) {
        return;
      }

      emitter.publish({
        operation_id: operationId,
        params: toStringParams(req.params),
        org_id: orgId,
      });
    });

    next();
  };
};
