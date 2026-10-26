import type { ChildProcess } from "node:child_process";

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

/** Kills a whole detached process group (see {@link trackAgentProcess}). No-op if the pid is unknown or already gone. */
export function killProcessGroup(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // Already exited, or this platform doesn't support negative-pid group
    // kills — falling back to the single process is still better than
    // throwing out of a "best effort" cancel.
    try {
      process.kill(pid, signal);
    } catch {
      // Already gone.
    }
  }
}

/** Grace period between SIGTERM and SIGKILL when stopping an agent. */
const KILL_ESCALATION_MS = 3000;

/**
 * Makes an agent CLI process stoppable from the Stop button: registers it
 * for `runId` until it exits, and on cancel SIGTERMs its process group,
 * escalating to SIGKILL if it's still alive after a grace period.
 *
 * Spawn the agent with `detached: true` so it leads its own process group;
 * killing the group (negative pid) also reaches Bash tool calls etc. it
 * spawned. Killing only the top-level process left those running, and the
 * CLIs don't reliably exit while a child is active.
 *
 * Every adapter must call this — a run whose adapter skips it can't be
 * stopped without restarting the server.
 */
export function trackAgentProcess(
  runId: string,
  agent: ChildProcess,
  onStopping: () => void,
): { wasCancelled: () => boolean } {
  let cancelled = false;
  let exited = false;
  agent.once("close", () => {
    exited = true;
    unregisterActiveAgentProcess(runId);
  });
  agent.once("error", () => unregisterActiveAgentProcess(runId));

  registerActiveAgentProcess(runId, {
    kill: () => {
      cancelled = true;
      onStopping();
      killProcessGroup(agent.pid, "SIGTERM");
      setTimeout(() => {
        if (!exited) killProcessGroup(agent.pid, "SIGKILL");
      }, KILL_ESCALATION_MS).unref();
    },
  });
  return { wasCancelled: () => cancelled };
}
