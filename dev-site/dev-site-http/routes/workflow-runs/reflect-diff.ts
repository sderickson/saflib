import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  PathParams,
} from "@saflib/dev-site-spec/operations/reflectWorkflowRunDiff";
import { WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import { GitCommandError } from "@saflib/git";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { reflectRunDiff, MissingBaseCommitHashError } from "../../reflect-diff.ts";
import { getWorkflowsDbKey } from "../workflows/index.ts";

export const reflectWorkflowRunDiffHandler = createHandler(async (req, res) => {
  const { dbKey, repo_root, product_root, mainRef } = getDevSiteHttpContext();
  const { runId } = req.params as PathParams["reflectWorkflowRunDiff"];

  const { result, error } = await reflectRunDiff(getWorkflowsDbKey(), dbKey, runId, {
    repo_root,
    product_root,
    mainRef,
  });
  if (error) {
    switch (true) {
      case error instanceof WorkflowRunNotFoundError:
        throw createError(404, "Workflow run not found", { code: "RUN_NOT_FOUND" });
      case error instanceof MissingBaseCommitHashError:
        throw createError(409, error.message, { code: "MISSING_BASE_COMMIT_HASH" });
      case error instanceof GitCommandError:
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }

  const response: ResponseBody["reflectWorkflowRunDiff"][200] = {
    commit_diff: result.commit_diff,
    is_final: result.is_final,
  };
  res.status(200).json(response);
});
