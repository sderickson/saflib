import type { Handler, Request, Response } from "express";
import type { SecurityResolver } from "@saflib/express";
import type { DbKey } from "@saflib/drizzle";
import { getSafContext, getSafReporters, reportWarning } from "@saflib/node";
import {
  findActiveByHash,
  hashOpsToken,
  looksLikeOpsToken,
  opsTokenScopes,
  touchLastUsed,
  type OpsToken,
} from "@saflib/ops-db";
import { createFixedWindowLimiter, type FixedWindowLimiter } from "./rate-limit.ts";

/** What handlers see about the calling token (`res.locals.opsToken`). */
export interface OpsCaller {
  id: string;
  name: string;
  scopes: OpsToken["scopes"];
}

export interface OpsTokenResolverOptions {
  /** Requests per minute per token. Default 120. */
  perTokenPerMinute?: number;
  /** Failed authentications per minute per client IP. Default 20. */
  failuresPerIpPerMinute?: number;
  /** Injected for tests. */
  limiters?: { perToken: FixedWindowLimiter; failuresPerIp: FixedWindowLimiter };
}

/** Report at most once per key per minute: limits are hit in bursts. */
function createWarningThrottle(intervalMs = 60_000) {
  const last = new Map<string, number>();
  return (key: string, report: () => void) => {
    const now = Date.now();
    if ((last.get(key) ?? 0) > now - intervalMs) return;
    last.set(key, now);
    if (last.size > 10_000) last.clear();
    report();
  };
}

function reject(res: Response, status: number, message: string, retryAfter?: number) {
  if (retryAfter !== undefined) res.setHeader("Retry-After", String(retryAfter));
  res.status(status).json({ message });
}

function bearer(req: Request): string | undefined {
  const header = req.header("authorization");
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

/**
 * The `ops-token` security scheme: a standalone bearer credential (no user
 * session). Verifies the token against `ops-db`, enforces scopes and rate
 * limits, and sets `res.locals.opsToken` for handlers.
 */
export function createOpsTokenSecurityResolver(
  getDbKey: () => DbKey,
  options: OpsTokenResolverOptions = {},
): SecurityResolver {
  const limiters = options.limiters ?? {
    perToken: createFixedWindowLimiter({
      limit: options.perTokenPerMinute ?? 120,
      windowMs: 60_000,
    }),
    failuresPerIp: createFixedWindowLimiter({
      limit: options.failuresPerIpPerMinute ?? 20,
      windowMs: 60_000,
    }),
  };

  const throttle = createWarningThrottle();

  return {
    scopes: opsTokenScopes,
    standalone: true,
    // Any bearer header takes the token path (and is validated there); other
    // requests fall to the operation's session alternative, if it has one.
    applies: (req) => /^Bearer\s/i.test(req.header("authorization") ?? ""),
    middleware: (requiredScopes) => {
      const handler: Handler = async (req, res, next) => {
        const ip = req.ip ?? "unknown";
        const tooMany = () =>
          reject(res, 429, "Too many failed attempts", limiters.failuresPerIp.retryAfterSeconds(ip));
        const failed = (status: number, message: string) => {
          if (!limiters.failuresPerIp.hit(ip)) {
            throttle(`auth:${ip}`, () =>
              reportWarning("ops API: too many failed authentications from one address", {
                fingerprint: "ops.auth_failures_limited",
                extra: { clientIp: ip },
              }),
            );
            tooMany();
            return;
          }
          reject(res, status, message);
        };

        if (limiters.failuresPerIp.blocked(ip)) {
          tooMany();
          return;
        }

        const token = bearer(req);
        if (!token || !looksLikeOpsToken(token)) {
          failed(401, "Missing or malformed ops token");
          return;
        }
        try {
          const { result: opsToken, error } = await findActiveByHash(getDbKey(), hashOpsToken(token));
          if (error) {
            failed(401, "Unknown, revoked or expired ops token");
            return;
          }
          const missing = requiredScopes.filter(
            (scope) => !opsToken.scopes.includes(scope as OpsToken["scopes"][number]),
          );
          if (missing.length > 0) {
            reject(res, 403, `Ops token lacks scope: ${missing.join(", ")}`);
            return;
          }
          if (!limiters.perToken.hit(opsToken.id)) {
            throttle(`token:${opsToken.id}`, () =>
              reportWarning("ops API: token rate limited", {
                fingerprint: "ops.rate_limited",
                extra: { opsTokenId: opsToken.id },
              }),
            );
            reject(res, 429, "Rate limited", limiters.perToken.retryAfterSeconds(opsToken.id));
            return;
          }
          const caller: OpsCaller = { id: opsToken.id, name: opsToken.name, scopes: opsToken.scopes };
          res.locals.opsToken = caller;
          void touchLastUsed(getDbKey(), opsToken.id).catch((e: unknown) => {
            getSafReporters().log.warn("ops token last-used update failed", { error: String(e) });
          });
          getSafReporters().log.info("ops api call", {
            opsTokenId: opsToken.id,
            operationId: getSafContext().operationName,
          });
          next();
        } catch (e) {
          next(e);
        }
      };
      return [handler];
    },
  };
}

/**
 * For `createAuditRecorder({ resolveMachineActor })`: attributes ops API
 * requests to their token (`auth_method: ops_token`,
 * `actor_user_id: ops_token:<id>`).
 */
export function opsMachineActor(
  res: Response,
): { authMethod: string; actorId: string } | undefined {
  const caller = res.locals.opsToken as OpsCaller | undefined;
  return caller ? { authMethod: "ops_token", actorId: `ops_token:${caller.id}` } : undefined;
}
