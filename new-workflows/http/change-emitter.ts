import { InProcessChangeEmitter } from "@saflib/notify";

/**
 * Module-level singleton, same pattern as `newWorkflowsDbManager` — one
 * emitter shared by every request in this process. Each run gets its own
 * channel (`workflow-run:<runId>`) via the emitter's per-channel
 * buffering/subscription — `@saflib/notify`'s `channel_id` is a routing
 * key only, so this is the naming this package (not notify) is
 * responsible for choosing clearly.
 */
export const newWorkflowsChangeEmitter = new InProcessChangeEmitter();

export function runEventsChannel(runId: string): string {
  return `workflow-run:${runId}`;
}

export function publishRunChanged(runId: string): void {
  newWorkflowsChangeEmitter.publish({
    operation_id: "advanceWorkflowRun",
    params: { runId },
    channel_id: runEventsChannel(runId),
  });
}
