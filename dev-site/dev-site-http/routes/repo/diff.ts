import { createHandler } from "@saflib/express";
import type {
  QueryParams,
  ResponseBody,
} from "@saflib/dev-site-spec/operations/getRepoDiff";
import { GitCommandError, diffRefs } from "@saflib/git";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";

export const getRepoDiffHandler = createHandler(async (req, res) => {
  const { repo_root } = getDevSiteHttpContext();
  const query = (req.query ?? {}) as NonNullable<QueryParams["getRepoDiff"]>;
  const base = query.base;
  const head = query.head;
  const prefix = typeof query.prefix === "string" ? query.prefix : undefined;

  if (!base) {
    throw createError(400, "base is required", { code: "MISSING_BASE" });
  }
  if (!head) {
    throw createError(400, "head is required", { code: "MISSING_HEAD" });
  }

  const { result, error } = diffRefs(repo_root, base, head, { pathPrefix: prefix });
  if (error) {
    if (error instanceof GitCommandError) {
      throw createError(400, error.message, { code: "GIT_COMMAND_FAILED" });
    }
    throw error satisfies never;
  }

  const response: ResponseBody["getRepoDiff"][200] = {
    diff: result.text,
    truncated: result.truncated,
  };
  res.status(200).json(response);
});
