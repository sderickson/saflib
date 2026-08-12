import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  PathParams,
} from "@saflib/dev-site-spec/operations/getCommitPackage";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { getCommitPackage } from "../../get-package.ts";

export const getCommitPackageHandler = createHandler(async (req, res) => {
  const { dbKey, repoRoot, productRoot, mainRef } = getDevSiteHttpContext();
  const { hash, packageName: rawName } =
    req.params as PathParams["getCommitPackage"];
  const packageName = decodeURIComponent(rawName);
  const { result, error } = await getCommitPackage(dbKey, hash, packageName, {
    repoRoot,
    productRoot,
    mainRef,
  });
  if (error) {
    switch (true) {
      case error instanceof AnalyzedCommitNotFoundError:
        throw createError(404, error.message, {
          code: "PACKAGE_NOT_FOUND",
        });
      default:
        throw error satisfies never;
    }
  }
  const response: ResponseBody["getCommitPackage"][200] = {
    packageDetail: result as ResponseBody["getCommitPackage"][200]["packageDetail"],
  };
  res.status(200).json(response);
});
