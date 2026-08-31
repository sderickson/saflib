import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  PathParams,
} from "@saflib/dev-site-spec/operations/diffCommits";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { diffCommits } from "../../diff-commits.ts";

export const diffCommitsHandler = createHandler(async (req, res) => {
  const { dbKey, repo_root, product_root, mainRef } = getDevSiteHttpContext();
  const { hash, other_hash } = req.params as PathParams["diffCommits"];
  const { result, error } = await diffCommits(dbKey, hash, other_hash, {
    repo_root,
    product_root,
    mainRef,
  });
  if (error) {
    switch (true) {
      case error instanceof AnalyzedCommitNotFoundError:
        throw createError(404, "Commit not found", {
          code: "COMMIT_NOT_FOUND",
        });
      default:
        throw error satisfies never;
    }
  }
  const response: ResponseBody["diffCommits"][200] = {
    commit_diff: result,
  };
  res.status(200).json(response);
});
