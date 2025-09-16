import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { templateFileDb } from "@template/file-db";
import {
  templateFileServiceStorage,
  type TemplateFileServiceContextOptions,
} from "@template/file-service-common";

/**
 * Creates the HTTP server for the template-file service.
 */
export function createTemplateFileHttpApp(
  options: TemplateFileServiceContextOptions,
) {
  let dbKey = options.templateFileDbKey;
  if (!dbKey) {
    dbKey = templateFileDb.connect();
  }

  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  const context = { templateFileDbKey: dbKey };
  app.use((_req, _res, next) => {
    templateFileServiceStorage.run(context, () => {
      next();
    });
  });

  // Add route handlers here. Do not prefix the routes; the router will handle the prefix.
  // app.use(createTemplateFileRouter());

  app.use(createErrorMiddleware());

  return app;
}
