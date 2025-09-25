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
import type { Handler } from "express";

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

    let auth: Auth | undefined;
    const userId = req.headers["x-user-id"];
    const userEmail = req.headers["x-user-email"];
    const userScopes = req.headers["x-user-scopes"];
    const scopes = userScopes ? (userScopes as string).split(",") : [];
    if (userId && userEmail && scopes) {
      auth = {
        userId: userId as string,
        userEmail: userEmail as string,
        userScopes: scopes,
      };
    }

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
  };
  return contextMiddleware;
};
