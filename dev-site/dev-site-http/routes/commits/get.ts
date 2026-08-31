import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  PathParams,
} from "@saflib/dev-site-spec/operations/getCommits";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { getCommit } from "../../get-commit.ts";

export const getCommitsHandler = createHandler(async (req, res) => {
  const { dbKey, repo_root, product_root, mainRef } = getDevSiteHttpContext();
  const { hash } = req.params as PathParams["getCommits"];
  const { result, error } = await getCommit(dbKey, hash, {
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
  const response: ResponseBody["getCommits"][200] = {
    commit_detail: result,
  };
  res.status(200).json(response);
});
