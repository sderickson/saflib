import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";

// TODO: npm install and import any database library for this service.
// import { serviceDb } from "@your-org/service-db";

// TODO: npm install and import your service-specific context and storage
// import { serviceStorage, type ServiceOptions } from "@your-org/service-common";

/**
 * Creates the HTTP server for the template-file service.
 */
export function createApp() {
  // TODO: Set up database connections if needed
  // let dbKey = options.dbKey;
  // if (!dbKey) {
  //   dbKey = serviceDb.connect();
  // }

  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  // TODO: Set up service context
  // const context = { dbKey, callbacks: options.callbacks };
  // app.use((_req, _res, next) => {
  //   serviceStorage.run(context, () => {
  //     next();
  //   });
  // });

  // Add route handlers here. Do not prefix the routes; the router will handle the prefix.
  // app.use(createResourceNameRouter())

  app.use(createErrorMiddleware());

  return app;
}
