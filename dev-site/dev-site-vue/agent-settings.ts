/**
 * Persisted preference for which agent CLI drives new workflow runs
 * from the Plans UI. Same localStorage pattern as `run-alerts.ts` —
 * a per-viewer convenience that soft-fails if storage is unavailable.
 */
import { computed, readonly, ref } from "vue";

export type AgentCli = "cursor-agent" | "claude-agent";

export const AGENT_CLI_OPTIONS: ReadonlyArray<{
  value: AgentCli;
  title: string;
  subtitle: string;
}> = [
  {
    value: "claude-agent",
    title: "Claude",
    subtitle: "Claude Code CLI",
  },
  {
    value: "cursor-agent",
    title: "Cursor",
    subtitle: "cursor-agent CLI",
  },
];

const STORAGE_KEY = "dev-site.agent.cli";
/** Claude was the pre-Cursor default; Cursor is opt-in via the settings menu. */
const DEFAULT_CLI: AgentCli = "claude-agent";

function isAgentCli(value: string | null): value is AgentCli {
  return value === "cursor-agent" || value === "claude-agent";
}

function readStored(): AgentCli {
  if (typeof localStorage === "undefined") return DEFAULT_CLI;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isAgentCli(raw) ? raw : DEFAULT_CLI;
  } catch {
    return DEFAULT_CLI;
  }
}

function writeStored(value: AgentCli): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private-browsing/quota — preference not persisting isn't fatal.
  }
}

const agentCli = ref<AgentCli>(readStored());

/** Current preference — readable outside setup (e.g. run orchestrator). */
export function getAgentCli(): AgentCli {
  return agentCli.value;
}

export function setAgentCli(next: AgentCli): void {
  agentCli.value = next;
  writeStored(next);
}

/** Test-only: reset module state between vitest files. */
export function __resetAgentSettingsForTests(): void {
  agentCli.value = DEFAULT_CLI;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function useAgentSettings() {
  return {
    agentCli: readonly(agentCli),
    agentLabel: computed(
      () =>
        AGENT_CLI_OPTIONS.find((o) => o.value === agentCli.value)?.title ??
        agentCli.value,
    ),
    setAgentCli,
  };
}
