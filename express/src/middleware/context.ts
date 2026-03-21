import {
  type SafContext,
  safContextStorage,
  type SafReporters,
  createLogger,
  safReportersStorage,
  type Auth,
  defaultErrorReporter,
  getServiceName,
} from "@saflib/node";
import type { Handler, Request } from "express";
import createError from "http-errors";

interface KratosAdminIdentity {
  traits?: { email?: string };
  verifiable_addresses?: Array<{ verified?: boolean }>;
}

function defaultKratosAdminUrl(): string {
  return process.env.KRATOS_ADMIN_URL ?? "http://kratos:4434";
}

async function resolveKratosAuth(identityId: string): Promise<Auth> {
  const baseUrl = defaultKratosAdminUrl().replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/admin/identities/${identityId}`);
  if (!res.ok) {
    throw createError(
      502,
      `Kratos admin identity lookup failed: ${res.status}`,
    );
  }
  const identity = (await res.json()) as KratosAdminIdentity;
  const userEmail = identity.traits?.email;
  if (!userEmail) {
    throw createError(500, "Kratos identity missing email trait");
  }
  const emailVerified = identity.verifiable_addresses?.[0]?.verified ?? false;

  const adminRaw = process.env.IDENTITY_SERVICE_ADMIN_EMAILS ?? "";
  const adminEmails = new Set(
    adminRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  );

  const userScopes: string[] = [];
  if (adminEmails.has(userEmail) && emailVerified) {
    userScopes.push("*");
  } else {
    userScopes.push("none");
  }

  return {
    userId: identityId,
    userEmail,
    userScopes,
    emailVerified,
  };
}

function resolveIdentityServerAuth(req: Request): Auth | undefined {
  const userId = req.headers["x-user-id"];
  const userEmail = req.headers["x-user-email"];
  const userScopesHeader = req.headers["x-user-scopes"];
  const emailVerified = req.headers["x-user-email-verified"];
  if (userId && userEmail) {
    const scopes = userScopesHeader
      ? (userScopesHeader as string).split(",")
      : [];
    return {
      userId: userId as string,
      userEmail: userEmail as string,
      userScopes: scopes,
      emailVerified: emailVerified === "true",
    };
  }
  return undefined;
}

async function resolveAuth(req: Request): Promise<Auth | undefined> {
  const kratosId = req.headers["x-kratos-authenticated-identity-id"];
  if (typeof kratosId === "string" && kratosId.length > 0) {
    return await resolveKratosAuth(kratosId);
  }
  return resolveIdentityServerAuth(req);
}

export const makeContextMiddleware = () => {
  const contextMiddleware: Handler = (req, _res, next) => {
    const operationName =
      req.openapi?.schema.operationId ??
      req.openapi?.openApiRoute ??
      "unknown-operation";
    let reqId = "no-request-id";
    if (req.headers && req.headers["x-request-id"]) {
      reqId = req.headers["x-request-id"] as string;
    }

    resolveAuth(req)
      .then((auth) => {
        const context: SafContext = {
          requestId: reqId,
          serviceName: getServiceName(),
          subsystemName: "http",
          operationName,
          auth,
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
