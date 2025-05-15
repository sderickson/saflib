import { authDb } from "@saflib/auth-db";
import { recommendedErrorHandlers } from "@saflib/express";
import express from "express";
import { makeAuthRouter } from "./routes/auth/index.ts";
import { makeUsersRouter } from "./routes/users/index.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authServiceStorage } from "./context.ts";

// Define properties added to Express Request objects by middleware
declare global {
  namespace Express {
    interface Request {
      isValidCsrfToken: () => boolean;
    }
  }
}

export function createApp(dbKey?: DbKey) {
  if (!dbKey) {
    dbKey = authDb.connect();
  }

  const app = express();
  app.set("trust proxy", 1);

  app.set(
    "saf:admin emails",
    new Set(process.env.ADMIN_EMAILS?.split(",") || []),
  );

  const context = { dbKey };
  app.use((_req, _res, next) => {
    authServiceStorage.run(context, () => {
      next();
    });
  });
  app.use("/auth", makeAuthRouter());
  app.use("/users", makeUsersRouter());
  app.use(recommendedErrorHandlers);

  return app;
}
