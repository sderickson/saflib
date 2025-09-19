import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { secretsDb } from "@saflib/secrets-db";
import {
  secretsServiceStorage,
  type SecretsServiceContextOptions,
} from "@saflib/secrets-service-common";
import { createSecretsRouter } from "./routes/secrets/index.ts";
import { createAccessRequestsRouter } from "./routes/access-requests/index.ts";

/**
 * Creates the HTTP server for the secrets service.
 */
export function createSecretsHttpApp(
  options: SecretsServiceContextOptions,
) {
  let dbKey = options.secretsDbKey;
  if (!dbKey) {
    dbKey = secretsDb.connect();
  }

  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  const context = { secretsDbKey: dbKey };
  app.use((_req, _res, next) => {
    secretsServiceStorage.run(context, () => {
      next();
    });
  });

  // Add route handlers here. Do not prefix the routes; the router will handle the prefix.
  app.use("/secrets", createSecretsRouter());
  app.use("/access-requests", createAccessRequestsRouter());

  app.use(createErrorMiddleware());

  return app;
}
