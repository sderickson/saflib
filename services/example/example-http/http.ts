import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { exampleDb } from "example-db";
import {
  exampleServiceStorage,
  type ExampleServiceContextOptions,
} from "example-service-common";

/**
 * Creates the HTTP server for the example service.
 */
export function createExampleHttpApp(
  options: ExampleServiceContextOptions,
) {
  let dbKey = options.exampleDbKey;
  if (!dbKey) {
    dbKey = exampleDb.connect();
  }

  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  const context = { exampleDbKey: dbKey };
  app.use((_req, _res, next) => {
    exampleServiceStorage.run(context, () => {
      next();
    });
  });

  // Add route handlers here. Do not prefix the routes; the router will handle the prefix.
  // app.use(createExampleRouter());

  app.use(createErrorMiddleware());

  return app;
}
