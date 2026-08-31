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
  const { dbKey, repo_root, product_root, mainRef } = getDevSiteHttpContext();
  const { hash, package_name: rawName } =
    req.params as PathParams["getCommitPackage"];
  const package_name = decodeURIComponent(rawName);
  const { result, error } = await getCommitPackage(dbKey, hash, package_name, {
    repo_root,
    product_root,
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
    package_detail: result as ResponseBody["getCommitPackage"][200]["package_detail"],
  };
  res.status(200).json(response);
});
