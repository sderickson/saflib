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
import type { Session } from "@ory/client";

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
  const userEmail = session.identity.traits?.email;
  if (!userEmail) {
    throw createError(500, "Kratos identity missing email trait");
  }
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

  return {
    userId,
    userEmail,
    isAdmin,
    emailVerified,
  };
}

async function resolveAuth(req: Request): Promise<Auth | undefined> {
  return resolveKratosAuth(req.headers.cookie as string);
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
