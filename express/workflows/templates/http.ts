import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { __serviceName__Db } from "template-package-db";
import {
  __serviceName__ServiceStorage,
  type __ServiceName__ServiceContextOptions,
} from "template-package-service-common";

// BEGIN SORTED WORKFLOW AREA router-imports FOR express/add-handler
import { create__GroupName__Router } from "./routes/__group-name__/index.ts";
// END WORKFLOW AREA

// BEGIN SORTED WORKFLOW AREA storeImports FOR dne1
import { createObjectStore } from "@saflib/object-store";
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

  const context = { 
    __serviceName__DbKey: dbKey,
    // BEGIN SORTED WORKFLOW AREA storeProperties FOR dne2
    __storeName__: options.__storeName__ ?? createObjectStore({ type: "test" }),
    // END SORTED WORKFLOW AREA
  };
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
