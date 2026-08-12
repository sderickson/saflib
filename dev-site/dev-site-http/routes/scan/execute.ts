import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  RequestBody,
} from "@saflib/dev-site-spec/operations/executeScan";
import createError from "http-errors";
import { GitCommandError } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";
import { scanCommits } from "../../scan.ts";

export const executeScanHandler = createHandler(async (req, res) => {
  const { dbKey, repoRoot, productRoot, mainRef } = getDevSiteHttpContext();
  const body = (req.body ?? {}) as NonNullable<RequestBody["executeScan"]>;
  const { result, error } = await scanCommits(dbKey, {
    repoRoot,
    productRoot,
    mainRef,
    limit: body.limit,
  });
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }
  const response: ResponseBody["executeScan"][200] = result;
  res.status(200).json(response);
});
