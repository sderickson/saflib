import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  PathParams,
  QueryParams,
} from "@saflib/dev-site-spec/operations/previewWorkflowRunDiff";
import { WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import { GitCommandError } from "@saflib/git";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { previewRunDiff } from "../../preview-diff.ts";
import { registry, getWorkflowsDbKey } from "../workflows/index.ts";

export const previewWorkflowRunDiffHandler = createHandler(async (req, res) => {
  const { dbKey, repo_root, product_root, mainRef } = getDevSiteHttpContext();
  const { runId } = req.params as PathParams["previewWorkflowRunDiff"];
  const { baseRunId } = (req.query ?? {}) as NonNullable<QueryParams["previewWorkflowRunDiff"]>;
  const baseRunIds = baseRunId === undefined ? [] : Array.isArray(baseRunId) ? baseRunId : [baseRunId];

  const { result, error } = await previewRunDiff(
    getWorkflowsDbKey(),
    dbKey,
    runId,
    registry,
    { repo_root, product_root, mainRef },
    { baseRunIds },
  );
  if (error) {
    switch (true) {
      case error instanceof WorkflowRunNotFoundError:
        throw createError(404, "Workflow run not found", { code: "RUN_NOT_FOUND" });
      case error instanceof GitCommandError:
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }

  const response: ResponseBody["previewWorkflowRunDiff"][200] = {
    commit_diff: result.commit_diff,
    entries: result.entries.map((e) => ({
      workflow_id: e.workflowId,
      step_index: e.stepIndex,
      kind: e.kind,
      applied: e.applied,
      reason: e.reason,
    })),
  };
  res.status(200).json(response);
});
