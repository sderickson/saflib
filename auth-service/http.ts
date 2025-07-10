import { authDb } from "@saflib/auth-db";
import { recommendedErrorHandlers } from "@saflib/express";
import express from "express";
import { makeAuthRouter } from "./routes/auth/index.ts";
import { makeUsersRouter } from "./routes/users/index.ts";
import { authServiceStorage } from "./context.ts";
import type { AuthServerOptions } from "./types.ts";
import { createEmailsRouter } from "@saflib/email-node";
import { jsonSpec } from "@saflib/auth-spec";
import { metricsMiddleware } from "@saflib/express";

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
    dbKey = authDb.connect();
  }

  const app = express();
  app.use(metricsMiddleware);
  app.set("trust proxy", 1);

  app.set(
    "saf:admin emails",
    new Set(process.env.ADMIN_EMAILS?.split(",") || []),
  );

  const context = { dbKey, callbacks: options.callbacks };
  app.use((_req, _res, next) => {
    authServiceStorage.run(context, () => {
      next();
    });
  });

  app.use(
    "/auth",
    createEmailsRouter({
      apiSpec: jsonSpec,
    }),
  );

  app.use("/auth", makeAuthRouter());
  app.use("/users", makeUsersRouter());
  app.use(recommendedErrorHandlers);

  return app;
}
