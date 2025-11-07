import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { tmpDb } from "tmp-db";
import {
  tmpServiceStorage,
  type TmpServiceContextOptions,
} from "tmp-service-common";

/**
 * Creates the HTTP server for the tmp service.
 */
export function createTmpHttpApp(
  options: TmpServiceContextOptions,
) {
  let dbKey = options.tmpDbKey;
  if (!dbKey) {
    dbKey = tmpDb.connect();
  }

  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  const context = { tmpDbKey: dbKey };
  app.use((_req, _res, next) => {
    tmpServiceStorage.run(context, () => {
      next();
    });
  });

  // Add route handlers here. Do not prefix the routes; the router will handle the prefix.
  // app.use(createTmpRouter());

  app.use(createErrorMiddleware());

  return app;
}
