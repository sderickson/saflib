import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/listCommits";
import { operationJsonSpec as getCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/getCommits";
import { operationJsonSpec as diffCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/diffCommits";
import { operationJsonSpec as getCommitPackageOperationJsonSpec } from "@saflib/dev-site-spec/operations/getCommitPackage";
import { operationJsonSpec as getCommitPackageGraphOperationJsonSpec } from "@saflib/dev-site-spec/operations/getCommitPackageGraph";
import { listCommitsHandler } from "./list.ts";
import { getCommitsHandler } from "./get.ts";
import { diffCommitsHandler } from "./diff.ts";
import { getCommitPackageHandler } from "./package.ts";
import { getCommitPackageGraphHandler } from "./package-graph.ts";

export function createCommitsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/commits",
    ...createOperationScopedMiddleware(listCommitsOperationJsonSpec),
    listCommitsHandler,
  );
  // More specific paths before /api/commits/:hash
  router.get(
    "/api/commits/:hash/package-graph",
    ...createOperationScopedMiddleware(getCommitPackageGraphOperationJsonSpec),
    getCommitPackageGraphHandler,
  );
  router.get(
    "/api/commits/:hash/packages/:package_name",
    ...createOperationScopedMiddleware(getCommitPackageOperationJsonSpec),
    getCommitPackageHandler,
  );
  router.get(
    "/api/commits/:hash",
    ...createOperationScopedMiddleware(getCommitsOperationJsonSpec),
    getCommitsHandler,
  );
  router.get(
    "/api/commits/:hash/diff/:other_hash",
    ...createOperationScopedMiddleware(diffCommitsOperationJsonSpec),
    diffCommitsHandler,
  );

  return router;
}
