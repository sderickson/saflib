import { type SafContext, safStorage } from "@saflib/node";
import type { Handler } from "express";
import { createLogger } from "@saflib/node";
import type { Auth } from "@saflib/node";

export const contextMiddleware: Handler = (req, _res, next) => {
  let reqId = "no-request-id";
  if (req.headers && req.headers["x-request-id"]) {
    reqId = req.headers["x-request-id"] as string;
  }

  const log = createLogger(reqId);

  let auth: Auth | undefined;
  const userId = req.headers["x-user-id"];
  const userEmail = req.headers["x-user-email"];
  const userScopes = req.headers["x-user-scopes"];
  const userEmailVerified = req.headers["x-user-email-verified"] === "true";
  const scopes = userScopes ? (userScopes as string).split(",") : [];
  if (userId && userEmail && scopes) {
    auth = {
      userId: parseInt(userId as string),
      userEmail: userEmail as string,
      userEmailVerified,
      userScopes: scopes,
    };
  }

  const context: SafContext = {
    requestId: reqId,
    log,
    auth,
  };
  safStorage.run(context, () => {
    next();
  });
};
