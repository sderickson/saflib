import { createHandler } from "@saflib/express";
import type { ResponseBody, QueryParams } from "@saflib/dev-site-spec/operations/listCommits";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { listCommitSummaries } from "../../get-commit.ts";

export const listCommitsHandler = createHandler(async (req, res) => {
  const { dbKey } = getDevSiteHttpContext();
  const query = (req.query ?? {}) as NonNullable<QueryParams["listCommits"]>;
  const { result, error } = await listCommitSummaries(dbKey, {
    cursor: query.cursor,
    limit: query.limit !== undefined ? Number(query.limit) : undefined,
  });
  if (error) {
    switch (true) {
      case error instanceof AnalyzedCommitNotFoundError:
        throw createError(404, "Cursor commit not found", {
          code: "COMMIT_NOT_FOUND",
        });
      default:
        throw error satisfies never;
    }
  }
  const response: ResponseBody["listCommits"][200] = {
    commits: result.commits,
    nextCursor: result.nextCursor,
  };
  res.status(200).json(response);
});
