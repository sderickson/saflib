import { createHandler } from "@saflib/express";
import type { ResponseBody } from "@saflib/dev-site-spec/operations/executeScan";
import createError from "http-errors";
import { GitCommandError } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";
import { scanCommits } from "../../scan.ts";

export const executeScanHandler = createHandler(async (_req, res) => {
  const { dbKey, repoRoot, productRoot, mainRef } = getDevSiteHttpContext();
  const { result, error } = await scanCommits(dbKey, {
    repoRoot,
    productRoot,
    mainRef,
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
