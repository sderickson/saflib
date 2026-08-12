import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listRepoFilesOperationJsonSpec } from "@saflib/dev-site-spec/operations/listRepoFiles";
import { operationJsonSpec as getRepoFileOperationJsonSpec } from "@saflib/dev-site-spec/operations/getRepoFile";
import { listRepoFilesHandler } from "./files.ts";
import { getRepoFileHandler } from "./file.ts";

export function createRepoRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/repo/files",
    ...createOperationScopedMiddleware(listRepoFilesOperationJsonSpec, {
      enforceAuth: false,
    }),
    listRepoFilesHandler,
  );
  router.get(
    "/api/repo/file",
    ...createOperationScopedMiddleware(getRepoFileOperationJsonSpec, {
      enforceAuth: false,
    }),
    getRepoFileHandler,
  );

  return router;
}
