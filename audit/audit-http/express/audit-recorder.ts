import type { Handler, Request, Response } from "express";
import type { OpenApiRequestMetadata } from "express-openapi-validator/dist/framework/types.ts";
import createError from "http-errors";
import type { DbKey } from "@saflib/drizzle";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import type { AuditEventDetails } from "@saflib/audit-db/schemas/audit-event";
import type { SafContext } from "@saflib/node";
import { getSafContext, getSafReporters } from "@saflib/node";
import type { AuditMapEntry, AuditOutcome } from "./audit-map.ts";

const DEFAULT_FAIL_CLOSED_STATUS_CODES: readonly number[] = [200, 201, 204];

/** `res.locals` keys written by the audit recorder / fail-closed audit. */
export interface HttpAuditRecorderLocals {
  auditRequestStartedAt?: number;
  /** When set, finish handler skips — fail-closed path already appended rows. */
  __httpAuditRecorderSkip?: boolean;
}

export type AuditRecorderOptions = {
  getAuditDbKey: () => DbKey | undefined;
  auditMap: Readonly<Record<string, AuditMapEntry>>;
};

export type AuditRecorder = {
  middleware: () => Handler;
  appendFailClosedHttpAuditIfRequired: (
    req: Request,
    res: Response,
    options: FailClosedHttpAuditOptions,
  ) => Promise<void>;
  setAuditMapOverrideForTests: (map: Record<string, AuditMapEntry>) => void;
  clearAuditMapOverrideForTests: () => void;
};

function recorderLocals(res: Response): HttpAuditRecorderLocals {
  return res.locals as HttpAuditRecorderLocals;
}

function openApiStyleToExpressRoute(openApiRoute: string): string {
  return openApiRoute.replace(/\{([^}]+)\}/g, ":$1");
}

export function resolveRoutePattern(
  req: Request & { openapi?: OpenApiRequestMetadata },
): string | undefined {
  const o = req.openapi;
  const fromExpress = o?.expressRoute?.trim();
  if (fromExpress) return fromExpress;
  const fromOpenApi = o?.openApiRoute?.trim();
  if (fromOpenApi) return openApiStyleToExpressRoute(fromOpenApi);
  const fromRoute = req.route?.path;
  if (typeof fromRoute === "string" && fromRoute.trim() !== "") {
    return fromRoute;
  }
  if (typeof req.path === "string" && req.path.trim() !== "") {
    return req.path;
  }
  return undefined;
}

function serializeQueryParams(
  query: Request["query"],
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.map((v) =>
        typeof v === "string" ? v : JSON.stringify(v),
      );
    } else if (value !== null && typeof value === "object") {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

function defaultOutcome(statusCode: number): AuditOutcome {
  if (statusCode >= 200 && statusCode < 300) return "success";
  if (statusCode === 304) return "success";
  if (statusCode === 401 || statusCode === 403) return "denied";
  return "error";
}

function outcomeForEntry(
  entry: AuditMapEntry,
  statusCode: number,
): AuditOutcome {
  if (entry.outcomeOverride) {
    return entry.outcomeOverride(statusCode);
  }
  return defaultOutcome(statusCode);
}

function primaryResourceId(params: Record<string, string>): string | undefined {
  const values = Object.values(params);
  return values.length > 0 ? values[0] : undefined;
}

function resourceIdFromPath(
  routePattern: string,
  path: string,
): string | undefined {
  const patternParts = routePattern.split("/");
  const pathParts = path.split("/");
  if (patternParts.length !== pathParts.length) return undefined;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i]?.startsWith(":")) {
      const value = pathParts[i];
      return value === undefined || value === "" ? undefined : value;
    }
  }
  return undefined;
}

function resolveResourceId(
  req: Request,
  routePattern: string,
): string | undefined {
  return (
    primaryResourceId(req.params as Record<string, string>) ??
    resourceIdFromPath(routePattern, req.path)
  );
}

function logAuditEventRecorded(args: {
  event_type: string;
  resource_type: string;
  resource_id: string | null | undefined;
  outcome: AuditOutcome;
  method: string;
  route_pattern: string;
  status_code: number;
  request_id: string | null | undefined;
  actor_user_id: string | null | undefined;
}): void {
  const { log } = getSafReporters();
  log.info(
    `audit event recorded (${args.event_type}/${args.resource_type})`,
    args,
  );
}

export interface FailClosedHttpAuditOptions {
  responseStatusCode: number;
}

/** Factory for HTTP audit recording wired to a product's audit DB key and route map. */
export function createAuditRecorder(
  options: AuditRecorderOptions,
): AuditRecorder {
  let activeAuditMap: Readonly<Record<string, AuditMapEntry>> =
    options.auditMap;

  const getAuditDbKey = options.getAuditDbKey;

  async function emitOneRow(
    auditDbKey: DbKey,
    saf: SafContext,
    args: {
      ts: Date;
      outcome: AuditOutcome;
      authMethod: string;
      eventType: string;
      resourceType: string;
      resourceId: string | undefined;
      details: AuditEventDetails;
    },
    logContext: {
      method: string;
      routePattern: string;
      statusCode: number;
    },
  ): Promise<void> {
    try {
      await appendAuditEvent(auditDbKey, {
        ts: args.ts,
        source: "http",
        actor_user_id: saf.auth?.userId ?? null,
        auth_method: args.authMethod,
        request_id: saf.requestId ?? null,
        client_ip: saf.clientIp ?? null,
        event_type: args.eventType,
        resource_type: args.resourceType,
        resource_id: args.resourceId ?? null,
        outcome: args.outcome,
        details: args.details,
      });
      logAuditEventRecorded({
        event_type: args.eventType,
        resource_type: args.resourceType,
        resource_id: args.resourceId ?? null,
        outcome: args.outcome,
        method: logContext.method,
        route_pattern: logContext.routePattern,
        status_code: logContext.statusCode,
        request_id: saf.requestId ?? null,
        actor_user_id: saf.auth?.userId ?? null,
      });
    } catch (err) {
      const { log, logError } = getSafReporters();
      log.error("appendAuditEvent failed", { err });
      logError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async function appendFailClosedHttpAuditIfRequired(
    req: Request,
    res: Response,
    failClosedOptions: FailClosedHttpAuditOptions,
  ): Promise<void> {
    const routePattern = resolveRoutePattern(req);
    if (!routePattern) return;

    const method = req.method.toUpperCase();
    const mapKey = `${method} ${routePattern}`;
    const entry = activeAuditMap[mapKey];
    if (!entry?.failClosed) return;

    const allowed = entry.failClosedStatusCodes ?? [
      ...DEFAULT_FAIL_CLOSED_STATUS_CODES,
    ];
    if (!allowed.includes(failClosedOptions.responseStatusCode)) return;

    const auditDbKey = getAuditDbKey();
    if (!auditDbKey) {
      throw createError(503, "Audit log unavailable");
    }

    let saf: SafContext;
    try {
      saf = getSafContext();
    } catch {
      throw createError(503, "Audit log unavailable");
    }

    const startedAt = recorderLocals(res).auditRequestStartedAt ?? Date.now();
    const outcome = outcomeForEntry(entry, failClosedOptions.responseStatusCode);
    const authMethod = saf.auth?.userId ? "kratos_session" : "none";
    const ts = new Date();
    const durationMs = Date.now() - startedAt;
    const pathParams = req.params as Record<string, string>;
    const primaryId = resolveResourceId(req, routePattern);

    const baseDetails = (): Extract<AuditEventDetails, { source: "http" }> => ({
      source: "http",
      method,
      route_pattern: routePattern,
      path_params: { ...pathParams },
      query_params: serializeQueryParams(req.query),
      status_code: failClosedOptions.responseStatusCode,
      duration_ms: durationMs,
      user_agent: saf.userAgent,
      operation_id: saf.operationName,
    });

    try {
      await emitOneRow(
        auditDbKey,
        saf,
        {
          ts,
          outcome,
          authMethod,
          eventType: entry.eventType,
          resourceType: entry.resourceType,
          resourceId: primaryId,
          details: baseDetails(),
        },
        {
          method,
          routePattern,
          statusCode: failClosedOptions.responseStatusCode,
        },
      );
      for (const rt of entry.alsoEmitFor ?? []) {
        await emitOneRow(
          auditDbKey,
          saf,
          {
            ts,
            outcome,
            authMethod,
            eventType: entry.eventType,
            resourceType: rt,
            resourceId: undefined,
            details: baseDetails(),
          },
          {
            method,
            routePattern,
            statusCode: failClosedOptions.responseStatusCode,
          },
        );
      }
    } catch (err) {
      recorderLocals(res).__httpAuditRecorderSkip = true;
      const { log, logError } = getSafReporters();
      log.error("appendAuditEvent failed (fail-closed)", { err });
      logError(err instanceof Error ? err : new Error(String(err)));
      throw createError(503, "Audit log unavailable");
    }

    recorderLocals(res).__httpAuditRecorderSkip = true;
  }

  async function emitRows(
    req: Request,
    res: Response,
    startedAt: number,
  ): Promise<void> {
    try {
      if (recorderLocals(res).__httpAuditRecorderSkip) return;

      const routePattern = resolveRoutePattern(req);
      if (!routePattern) return;

      const method = req.method.toUpperCase();
      const mapKey = `${method} ${routePattern}`;
      const entry = activeAuditMap[mapKey];
      if (!entry) return;

      const auditDbKey = getAuditDbKey();
      if (!auditDbKey) return;

      let saf: SafContext;
      try {
        saf = getSafContext();
      } catch {
        return;
      }
      const outcome = outcomeForEntry(entry, res.statusCode);
      const authMethod = saf.auth?.userId ? "kratos_session" : "none";
      const ts = new Date();
      const durationMs = Date.now() - startedAt;
      const pathParams = req.params as Record<string, string>;
      const primaryId = resolveResourceId(req, routePattern);

      const baseDetails = (): Extract<AuditEventDetails, { source: "http" }> => ({
        source: "http",
        method,
        route_pattern: routePattern,
        path_params: { ...pathParams },
        query_params: serializeQueryParams(req.query),
        status_code: res.statusCode,
        duration_ms: durationMs,
        user_agent: saf.userAgent,
        operation_id: saf.operationName,
      });

      try {
        await emitOneRow(
          auditDbKey,
          saf,
          {
            ts,
            outcome,
            authMethod,
            eventType: entry.eventType,
            resourceType: entry.resourceType,
            resourceId: primaryId,
            details: baseDetails(),
          },
          { method, routePattern, statusCode: res.statusCode },
        );
        for (const rt of entry.alsoEmitFor ?? []) {
          await emitOneRow(
            auditDbKey,
            saf,
            {
              ts,
              outcome,
              authMethod,
              eventType: entry.eventType,
              resourceType: rt,
              resourceId: undefined,
              details: baseDetails(),
            },
            { method, routePattern, statusCode: res.statusCode },
          );
        }
      } catch {
        /* logged in emitOneRow */
      }
    } catch (err) {
      try {
        const { log, logError } = getSafReporters();
        log.error("audit emitRows failed", { err });
        logError(err instanceof Error ? err : new Error(String(err)));
      } catch {
        /* swallow — recorder must never throw */
      }
    }
  }

  return {
    middleware(): Handler {
      return (req, res, next) => {
        const startedAt = Date.now();
        recorderLocals(res).auditRequestStartedAt = startedAt;
        res.on("finish", () => {
          void emitRows(req, res, startedAt);
        });
        next();
      };
    },
    appendFailClosedHttpAuditIfRequired,
    setAuditMapOverrideForTests(map: Record<string, AuditMapEntry>): void {
      activeAuditMap = map;
    },
    clearAuditMapOverrideForTests(): void {
      activeAuditMap = options.auditMap;
    },
  };
}
