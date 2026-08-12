import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/listCommits";
import { operationJsonSpec as getCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/getCommits";
import { operationJsonSpec as diffCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/diffCommits";
import { operationJsonSpec as getCommitPackageOperationJsonSpec } from "@saflib/dev-site-spec/operations/getCommitPackage";
import { listCommitsHandler } from "./list.ts";
import { getCommitsHandler } from "./get.ts";
import { diffCommitsHandler } from "./diff.ts";
import { getCommitPackageHandler } from "./package.ts";

export function createCommitsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/commits",
    ...createOperationScopedMiddleware(listCommitsOperationJsonSpec, {
      enforceAuth: false,
    }),
    listCommitsHandler,
  );
  // More specific path before /api/commits/:hash
  router.get(
    "/api/commits/:hash/packages/:packageName",
    ...createOperationScopedMiddleware(getCommitPackageOperationJsonSpec, {
      enforceAuth: false,
    }),
    getCommitPackageHandler,
  );
  router.get(
    "/api/commits/:hash",
    ...createOperationScopedMiddleware(getCommitsOperationJsonSpec, {
      enforceAuth: false,
    }),
    getCommitsHandler,
  );
  router.get(
    "/api/commits/:hash/diff/:otherHash",
    ...createOperationScopedMiddleware(diffCommitsOperationJsonSpec, {
      enforceAuth: false,
    }),
    diffCommitsHandler,
  );

  return router;
}
