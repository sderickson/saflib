/**
 * Tracks the currently-running agent process for each run, so an HTTP
 * request on a *different* connection (a "stop" button) can cancel it.
 * `advanceRun`'s own promise resolves naturally once the killed process's
 * `close` event fires and its adapter rejects — see `claude-agent.ts` — so
 * no engine/db changes are needed: a cancellation just becomes an ordinary
 * `{status: "error"}` step outcome, same as any other agent failure.
 *
 * Module-level, in-process only — fine for dev-site's single Node process,
 * not meant to survive a restart or work across multiple processes.
 */
export interface CancellableHandle {
  kill: () => void;
}

const activeAgentProcesses = new Map<string, CancellableHandle>();

export function registerActiveAgentProcess(runId: string, handle: CancellableHandle): void {
  activeAgentProcesses.set(runId, handle);
}

export function unregisterActiveAgentProcess(runId: string): void {
  activeAgentProcesses.delete(runId);
}

/** Returns true if a running process was found (and asked to stop). */
export function cancelActiveAgentProcess(runId: string): boolean {
  const handle = activeAgentProcesses.get(runId);
  if (!handle) return false;
  handle.kill();
  return true;
}
