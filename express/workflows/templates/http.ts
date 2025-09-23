import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { __serviceName__Db } from "template-package-db";
import {
  __serviceName__ServiceStorage,
  type __ServiceName__ServiceContextOptions,
} from "template-package-service-common";

/**
 * Creates the HTTP server for the __service-name__ service.
 */
export function create__ServiceName__HttpApp(
  options: __ServiceName__ServiceContextOptions,
) {
  let dbKey = options.__serviceName__DbKey;
  if (!dbKey) {
    dbKey = __serviceName__Db.connect();
  }

  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  const context = { __serviceName__DbKey: dbKey };
  app.use((_req, _res, next) => {
    __serviceName__ServiceStorage.run(context, () => {
      next();
    });
  });

  // Add route handlers here. Do not prefix the routes; the router will handle the prefix.
  // app.use(create__ServiceName__Router());

  app.use(createErrorMiddleware());

  return app;
}
