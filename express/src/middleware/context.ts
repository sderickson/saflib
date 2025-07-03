import { type SafContext, safContextStorage } from "@saflib/node";
import type { Handler } from "express";
import type { Auth } from "@saflib/node";

export const makeContextMiddleware = (serviceName: string) => {
  const contextMiddleware: Handler = (req, _res, next) => {
    const operationName =
      req.openapi?.schema.operationId ??
      req.openapi?.openApiRoute ??
      "unknown-operation";
    let reqId = "no-request-id";
    if (req.headers && req.headers["x-request-id"]) {
      reqId = req.headers["x-request-id"] as string;
    }

    let auth: Auth | undefined;
    const userId = req.headers["x-user-id"];
    const userEmail = req.headers["x-user-email"];
    const userScopes = req.headers["x-user-scopes"];
    const scopes = userScopes ? (userScopes as string).split(",") : [];
    if (userId && userEmail && scopes) {
      auth = {
        userId: parseInt(userId as string),
        userEmail: userEmail as string,
        userScopes: scopes,
      };
    }

    const context: SafContext = {
      requestId: reqId,
      serviceName,
      operationName,
      auth,
    };
    safContextStorage.run(context, () => {
      next();
    });
  };
  return contextMiddleware;
};
