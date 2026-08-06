import {
  type SafContext,
  safContextStorage,
  type SafReporters,
  createLogger,
  safReportersStorage,
  type Auth,
  defaultErrorReporter,
  getServiceName,
  verifyAssertion,
  AssertionError,
} from "@saflib/node";
import type { Handler, Request } from "express";
import createError from "http-errors";
import { AuthenticatorAssuranceLevel, type Session } from "@ory/client";
import { typedEnv } from "@saflib/node";
import { resolveAuthFromIdentityId } from "@saflib/ory-kratos";
import { isInternalRequest } from "../markInternal.ts";

function defaultKratosBrowserUrl(): string {
  // TODO: use env var?
  return "http://kratos:4433";
}

async function resolveKratosAuth(cookie: string): Promise<Auth> {
  const baseUrl = defaultKratosBrowserUrl().replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/sessions/whoami`, {
    headers: {
      Cookie: cookie,
    },
  });
  if (!res.ok) {
    throw createError(502, `Kratos session lookup failed: ${res.status}`);
  }
  const session = (await res.json()) as Session;
  if (!session.identity) {
    throw createError(500, "Kratos identity not found");
  }
  const traits = session.identity.traits as {
    email?: string;
    phone?: string;
  };
  const userEmail = traits.email;
  if (!userEmail) {
    throw createError(500, "Kratos identity missing email trait");
  }
  const userPhone =
    typeof traits.phone === "string" && traits.phone.trim()
      ? traits.phone
      : undefined;
  const verifiableAddresses = session.identity.verifiable_addresses ?? [];
  const emailVerified =
    verifiableAddresses.find((a) => a.via === "email")?.verified ?? false;
  const userId = session.identity.id;

  const adminRaw = process.env.ADMIN_EMAILS ?? "";
  const adminEmails = new Set(
    adminRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  );
  const isAdmin = adminEmails.has(userEmail) && emailVerified;

  const aal = session.authenticator_assurance_level;
  const mfaCompleted =
    aal === AuthenticatorAssuranceLevel.Aal2 ||
    aal === AuthenticatorAssuranceLevel.Aal3;

  return {
    userId,
    userEmail,
    userPhone,
    isAdmin,
    emailVerified,
    mfaCompleted,
  };
}

function resolveTestAuth(req: Request): Auth | undefined {
  const userId = req.headers["x-user-id"];
  const userEmail = req.headers["x-user-email"];
  const userIsAdmin = req.headers["x-user-is-admin"] === "true";
  const emailVerified = req.headers["x-user-email-verified"];
  const userPhone = req.headers["x-user-phone"];
  const mfaCompleted = req.headers["x-user-mfa-completed"] === "true";
  if (userId && userEmail) {
    return {
      userId: userId as string,
      userEmail: userEmail as string,
      userPhone:
        typeof userPhone === "string" && userPhone.trim()
          ? userPhone
          : undefined,
      isAdmin: userIsAdmin && emailVerified === "true",
      emailVerified: emailVerified === "true",
      mfaCompleted,
    };
  }
  return undefined;
}

function trimmedHeader(req: Request, name: string): string | undefined {
  const v = req.headers?.[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function resolveClientIp(req: Request): string | undefined {
  const xff = trimmedHeader(req, "x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const ip = req.ip;
  if (typeof ip === "string" && ip.trim() !== "") {
    return ip.trim();
  }
  const socketAddr = req.socket?.remoteAddress;
  if (typeof socketAddr === "string" && socketAddr.trim() !== "") {
    return socketAddr.trim();
  }
  return undefined;
}

type AuthResolution = {
  auth?: Auth;
  /** From a verified identity assertion; overrides `x-request-id` when set. */
  requestId?: string;
  /** Lineage root from assertion claims; unset when absent. */
  originalRequestId?: string;
  /** Delivering job id from assertion claims; unset when absent. */
  jobId?: string;
};

function unauthorized(code: string, message: string): never {
  throw Object.assign(createError(401, message), { code });
}

async function resolveAssertionAuth(
  req: Request,
  token: string,
): Promise<AuthResolution> {
  let assertion;
  try {
    assertion = verifyAssertion(token);
  } catch (error) {
    if (error instanceof AssertionError) {
      unauthorized("assertion_invalid", "Invalid identity assertion");
    }
    throw error;
  }

  const operationId = req.openapi?.schema?.operationId;
  if (
    typeof operationId !== "string" ||
    assertion.targetOperationId !== operationId
  ) {
    unauthorized("assertion_invalid", "Invalid identity assertion");
  }

  const baseAuth = await resolveAuthFromIdentityId(assertion.userId);
  if (!baseAuth) {
    unauthorized(
      "auth_unresolvable",
      "Asserted identity could not be resolved",
    );
  }

  return {
    auth: {
      ...baseAuth,
      mfaCompleted: assertion.mfaCompleted === true,
    },
    requestId: assertion.requestId,
    originalRequestId: assertion.claims?.originalRequestId,
    jobId: assertion.claims?.jobId,
  };
}

async function resolveAuth(req: Request): Promise<AuthResolution> {
  // Order: assertion (internal only) → kratos header → test headers → anonymous.
  // The assertion header is never read on non-internal requests.
  if (isInternalRequest(req)) {
    const token = req.headers["x-saf-identity-assertion"];
    if (typeof token === "string" && token.length > 0) {
      // OpenAPI validator binds operationId; some apps run context middleware
      // both before and after the validator. Defer until operationId is known
      // so an earlier pass does not reject a valid assertion.
      if (req.openapi?.schema?.operationId) {
        return await resolveAssertionAuth(req, token);
      }
      return {};
    }
  }

  const kratosId = req.headers["x-kratos-authenticated-identity-id"];
  if (typeof kratosId === "string" && kratosId.length > 0) {
    return { auth: await resolveKratosAuth(req.headers.cookie as string) };
  }
  if (typedEnv.NODE_ENV === "test") {
    return { auth: resolveTestAuth(req) };
  }
  // No Kratos identity header (e.g. Caddy whoami returned 401, or request bypassed edge auth): treat as anonymous.
  return {};
}

export const makeContextMiddleware = () => {
  const contextMiddleware: Handler = (req, _res, next) => {
    const operationName =
      req.openapi?.schema.operationId ??
      req.openapi?.openApiRoute ??
      "unknown-operation";

    resolveAuth(req)
      .then((resolution) => {
        let reqId = "no-request-id";
        if (resolution.requestId) {
          reqId = resolution.requestId;
        } else if (req.headers && req.headers["x-request-id"]) {
          reqId = req.headers["x-request-id"] as string;
        }

        const hostHeader = req.headers?.host;
        const host =
          typeof hostHeader === "string" && hostHeader.trim() !== ""
            ? hostHeader.trim()
            : undefined;

        const origin = trimmedHeader(req, "origin");
        const userAgent = trimmedHeader(req, "user-agent");
        const acceptLanguage = trimmedHeader(req, "accept-language");
        const clientIp = resolveClientIp(req);

        const context: SafContext = {
          requestId: reqId,
          originalRequestId: resolution.originalRequestId,
          jobId: resolution.jobId,
          serviceName: getServiceName(),
          subsystemName: "http",
          operationName,
          auth: resolution.auth,
          host,
          origin,
          userAgent,
          clientIp,
          acceptLanguage,
        };

        const reporters: SafReporters = {
          log: createLogger(context),
          logError: defaultErrorReporter,
        };

        safContextStorage.run(context, () => {
          safReportersStorage.run(reporters, () => {
            next();
          });
        });
      })
      .catch(next);
  };
  return contextMiddleware;
};
