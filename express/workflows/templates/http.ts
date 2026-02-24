import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { __serviceName__Db } from "template-package-db";
import {
  __serviceName__ServiceStorage,
  type __ServiceName__ServiceContextOptions,
  makeContext,
} from "template-package-service-common";

// BEGIN SORTED WORKFLOW AREA router-imports FOR express/add-handler
import { create__GroupName__Router } from "./routes/__group-name__/index.ts";
// END WORKFLOW AREA

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

  const context = makeContext();
  app.use((_req, _res, next) => {
    __serviceName__ServiceStorage.run(context, () => {
      next();
    });
  });

  // BEGIN WORKFLOW AREA app-use-routes FOR express/add-handler
  app.use(create__GroupName__Router());
  // END WORKFLOW AREA

  app.use(createErrorMiddleware());

  return app;
}
