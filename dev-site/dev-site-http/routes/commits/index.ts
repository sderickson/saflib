import express, { type IRouter } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/listCommits";
import { operationJsonSpec as getCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/getCommits";
import { operationJsonSpec as diffCommitsOperationJsonSpec } from "@saflib/dev-site-spec/operations/diffCommits";
import { listCommitsHandler } from "./list.ts";
import { getCommitsHandler } from "./get.ts";
import { diffCommitsHandler } from "./diff.ts";

export function createCommitsRouter(): IRouter {
  const router = express.Router();

  router.get(
    "/api/commits",
    ...createOperationScopedMiddleware(listCommitsOperationJsonSpec, {
      enforceAuth: false,
    }),
    listCommitsHandler,
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
