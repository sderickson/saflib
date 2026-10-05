import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  PathParams,
} from "@saflib/dev-site-spec/operations/previewWorkflowDiff";
import { WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import { GitCommandError } from "@saflib/git";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { previewWorkflowDiff } from "../../preview-diff.ts";
import { registry, getWorkflowsDbKey } from "../workflows/index.ts";

/**
 * Matches `preview-workflow-diff.yaml`'s (optional) requestBody schema —
 * hand-typed rather than via the generated `RequestBody` helper, which
 * only supports `required: true` request bodies (see `advance.ts`'s same
 * note; this body has to stay optional too, since a preview with no
 * overrides sends none at all).
 */
interface PreviewWorkflowDiffRequestBody {
  input?: Record<string, unknown>;
  cwd?: string;
  baseRunIds?: string[];
}

export const previewWorkflowDiffHandler = createHandler(async (req, res) => {
  const { dbKey, repo_root, product_root, mainRef } = getDevSiteHttpContext();
  const { id } = req.params as PathParams["previewWorkflowDiff"];
  const body = (req.body ?? {}) as PreviewWorkflowDiffRequestBody;

  // Unlike the run-based preview (whose workflow_ref came from an already-
  // successfully-created run), `id` here is client-supplied and unchecked
  // — an unknown one throws from `loadWorkflowDefinition` (a rejected
  // promise, not a `{error}` result), same as `POST /workflows/{id}/runs`
  // itself treats that as an ordinary 404, not a server error.
  let outcome: Awaited<ReturnType<typeof previewWorkflowDiff>>;
  try {
    outcome = await previewWorkflowDiff(
      getWorkflowsDbKey(),
      dbKey,
      id,
      registry,
      { repo_root, product_root, mainRef },
      { input: body.input, cwd: body.cwd, baseRunIds: body.baseRunIds },
    );
  } catch (loadError) {
    throw createError(
      404,
      loadError instanceof Error ? loadError.message : `Workflow "${id}" not found`,
    );
  }
  const { result, error } = outcome;
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

  const response: ResponseBody["previewWorkflowDiff"][200] = {
    commit_diff: result.commit_diff,
    entries: result.entries.map((e) => ({
      workflow_id: e.workflowId,
      step_index: e.stepIndex,
      kind: e.kind,
      applied: e.applied,
      reason: e.reason,
      files: e.files,
    })),
  };
  res.status(200).json(response);
});
