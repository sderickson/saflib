import { authDb } from "@saflib/identity-db";
import { recommendedErrorHandlers } from "@saflib/express";
import express from "express";
import { makeAuthRouter } from "./routes/auth/index.ts";
import { makeUsersRouter } from "./routes/users/index.ts";
import { authServiceStorage } from "./context.ts";
import type { AuthServerOptions } from "./types.ts";
import { createEmailsRouter } from "@saflib/email-node";
import { metricsRouter, metricsMiddleware } from "@saflib/express";
import { typedEnv } from "./env.ts";

// Define properties added to Express Request objects by middleware
declare global {
  namespace Express {
    interface Request {
      isValidCsrfToken: () => boolean;
    }
  }
}

export function createApp(options: AuthServerOptions) {
  let dbKey = options.dbKey;
  if (!dbKey) {
    console.log("connecting to db");
    dbKey = authDb.connect();
  }

  const app = express();
  app.use(metricsRouter);
  app.use(metricsMiddleware);
  app.set("trust proxy", 1);

  app.set(
    "saf:admin emails",
    new Set(typedEnv.IDENTITY_SERVICE_ADMIN_EMAILS?.split(",") || []),
  );

  const context = { dbKey, callbacks: options.callbacks };
  app.use((_req, _res, next) => {
    authServiceStorage.run(context, () => {
      next();
    });
  });

  app.use("/", createEmailsRouter());
  app.use("/auth", makeAuthRouter());
  app.use("/users", makeUsersRouter());
  app.use(recommendedErrorHandlers);

  return app;
}
