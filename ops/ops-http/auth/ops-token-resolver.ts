import type { Handler, Request, Response } from "express";
import type { SecurityResolver } from "@saflib/express";
import type { DbKey } from "@saflib/drizzle";
import { getSafContext, getSafReporters } from "@saflib/node";
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

  return {
    scopes: opsTokenScopes,
    standalone: true,
    middleware: (requiredScopes) => {
      const handler: Handler = async (req, res, next) => {
        const ip = req.ip ?? "unknown";
        const tooMany = () =>
          reject(res, 429, "Too many failed attempts", limiters.failuresPerIp.retryAfterSeconds(ip));
        const failed = (status: number, message: string) => {
          if (!limiters.failuresPerIp.hit(ip)) {
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
