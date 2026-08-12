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
  const { dbKey, repoRoot, productRoot, mainRef } = getDevSiteHttpContext();
  const { hash, otherHash } = req.params as PathParams["diffCommits"];
  const { result, error } = await diffCommits(dbKey, hash, otherHash, {
    repoRoot,
    productRoot,
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
    commitDiff: result,
  };
  res.status(200).json(response);
});
