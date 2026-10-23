import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { advanceOnce } from "../../advance-once.ts";

/**
 * Matches `advance.yaml`'s (optional) requestBody schema — hand-typed
 * rather than via the generated `NewWorkflowsRequestBody` helper, which
 * only supports `required: true` request bodies (its conditional type
 * resolves to `never` for an optional one, since `X | undefined` doesn't
 * extend `{content: ...}`). This body has to stay optional: a normal
 * advance sends none at all, and marking it `required: true` at the spec
 * level would make validation reject that.
 */
interface AdvanceWorkflowRunRequestBody {
  revert?: boolean;
  skip?: boolean;
  extraPrompt?: string;
}

export const advanceWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;
  const body = (req.body ?? {}) as AdvanceWorkflowRunRequestBody;

  const outcome = await advanceOnce(ctx, runId, body);

  const response: NewWorkflowsResponseBody["advanceWorkflowRun"][200] = outcome;
  res.status(200).json(response);
});
