/**
 * Client-side "is this run in progress?" — matches `RunView`'s `isAdvancing`
 * so nav icons don't stay on a stale `failed` while a long `/advance` or
 * agent-message request is still open (the list endpoint is only refetched
 * at the start/end of those calls, not continuously).
 */
export function isRunAdvancingForDisplay(
  runId: string,
  serverIsAdvancing: boolean,
  opts: {
    activeRunId?: string;
    advancePending: boolean;
    agentMessagePendingRunId?: string;
  },
): boolean {
  return (
    serverIsAdvancing ||
    (opts.activeRunId === runId && opts.advancePending) ||
    opts.agentMessagePendingRunId === runId
  );
}
