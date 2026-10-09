import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { getByIdWorkflowRun, WorkflowRunNotFoundError, appendWorkflowLog } from "@saflib/new-workflows-db";
import { sendFreeformAgentMessage, type LogChunk } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { publishRunChanged } from "../../change-emitter.ts";

export const sendFreeformAgentMessageHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;
  const message = (req.body as { message?: string }).message;
  if (!message?.trim()) {
    throw createError(400, "Message is required");
  }

  const { result: run, error: getError } = await getByIdWorkflowRun(ctx.dbKey, { id: runId });
  if (getError) {
    switch (true) {
      case getError instanceof WorkflowRunNotFoundError:
        throw createError(404, "Run not found");
      default:
        throw getError satisfies never;
    }
  }

  const stepIndex = run.current_step_index;
  const { output, result } = sendFreeformAgentMessage(ctx.dbKey, runId, message);

  for await (const chunk of output as AsyncIterable<LogChunk>) {
    await appendWorkflowLog(ctx.dbKey, {
      run_id: runId,
      step_index: stepIndex,
      channel: chunk.channel,
      level: chunk.level,
      content: chunk.content,
      now: new Date(),
    });
    publishRunChanged(runId);
  }
  const outcome = await result;

  if (outcome.status === "error") {
    await appendWorkflowLog(ctx.dbKey, {
      run_id: runId,
      step_index: stepIndex,
      channel: "tool",
      level: "error",
      content: outcome.message,
      now: new Date(),
    });
  }

  publishRunChanged(runId);

  const response: NewWorkflowsResponseBody["sendFreeformAgentMessage"][200] = outcome;
  res.status(200).json(response);
});
