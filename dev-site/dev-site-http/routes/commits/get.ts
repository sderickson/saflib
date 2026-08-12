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
  const { dbKey } = getDevSiteHttpContext();
  const { hash } = req.params as PathParams["getCommits"];
  const { result, error } = await getCommit(dbKey, hash);
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
    commitDetail: result,
  };
  res.status(200).json(response);
});
