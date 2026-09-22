import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { getByIdWorkflowRun, WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import {
  gotoRunStep,
  parseGotoPath,
  GotoPathError,
  isRunAdvancing,
} from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapRunToWire } from "../../map-run.ts";
import { wasRunCancelled } from "../../run-cancellation.ts";
import { publishRunChanged } from "../../change-emitter.ts";

export const gotoWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;
  const body = req.body as { path?: string };

  if (!body?.path || typeof body.path !== "string") {
    throw createError(400, "Request body must include a string `path` (e.g. \"2/4\").");
  }

  const { error: getError } = await getByIdWorkflowRun(ctx.dbKey, {
    id: runId,
  });
  if (getError) {
    switch (true) {
      case getError instanceof WorkflowRunNotFoundError:
        throw createError(404, "Run not found");
      default:
        throw getError satisfies never;
    }
  }

  try {
    const path = parseGotoPath(body.path);
    await gotoRunStep(ctx.dbKey, runId, path, ctx.registry, { cwd: ctx.defaultCwd });
  } catch (error) {
    if (error instanceof GotoPathError) {
      throw createError(400, error.message);
    }
    throw error;
  }

  const { result: run, error } = await getByIdWorkflowRun(ctx.dbKey, { id: runId });
  if (error) {
    switch (true) {
      case error instanceof WorkflowRunNotFoundError:
        throw createError(404, "Run not found");
      default:
        throw error satisfies never;
    }
  }

  publishRunChanged(runId);

  const response: NewWorkflowsResponseBody["gotoWorkflowRun"][200] = {
    run: mapRunToWire(run, isRunAdvancing(ctx.dbKey, run.id), await wasRunCancelled(ctx.dbKey, run)),
    path: body.path,
  };
  res.status(200).json(response);
});
