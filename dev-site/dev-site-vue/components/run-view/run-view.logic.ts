import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";
import type { LogItem } from "../../group-logs.ts";

/** 1-based step label for UI (API `step_index` / `current_step_index` are 0-based). */
export function displayStepNumber(zeroBasedIndex: number): number {
  return zeroBasedIndex + 1;
}

export type FlatStepTreeNode = {
  path: string;
  kind: string;
  label?: string;
  isCurrent: boolean;
  runId?: string;
  depth: number;
};

export type FlatStepTreeNodeSource = {
  path: string;
  kind: string;
  label?: string;
  isCurrent: boolean;
  runId?: string;
  children?: FlatStepTreeNodeSource[];
};

export function flattenStepTree(
  nodes: FlatStepTreeNodeSource[] | undefined,
  depth = 0,
): FlatStepTreeNode[] {
  if (!nodes?.length) return [];
  return nodes.flatMap((node) => [
    {
      path: node.path,
      kind: node.kind,
      label: node.label,
      isCurrent: node.isCurrent,
      runId: node.runId,
      depth,
    },
    ...flattenStepTree(node.children, depth + 1),
  ]);
}

export function stepStatusClassNames(
  stepIndex: number,
  runCurrentStep: number | undefined,
  viewportStep: number | undefined,
): Record<string, boolean> {
  return {
    "run-view__sidebar-step--done":
      runCurrentStep !== undefined && stepIndex < runCurrentStep,
    "run-view__sidebar-step--running":
      runCurrentStep !== undefined && stepIndex === runCurrentStep,
    "run-view__sidebar-step--active": stepIndex === viewportStep,
  };
}

export function logItemStepIndex(item: LogItem): number | null {
  if (item.type === "tool-call") return item.useLog.step_index;
  if (item.type === "channel-group") return item.logs[0]!.step_index;
  return item.log.step_index;
}

export function logItemKey(item: LogItem): string {
  if (item.type === "tool-call") return item.id;
  if (item.type === "channel-group") return item.id;
  return item.log.id;
}

export function lastAgentInputLogId(logs: WorkflowLogEntry[]): string | undefined {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].channel === "agent-input") return logs[i].id;
  }
  return undefined;
}

export function isLastAgentInputItem(
  item: LogItem,
  lastAgentInputId: string | undefined,
): boolean {
  return item.type === "single" && item.log.id === lastAgentInputId;
}

export function scrollTopForLogTarget(
  container: HTMLElement,
  target: HTMLElement,
  paddingPx = 4,
): number {
  const top =
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop;
  return Math.max(0, top - paddingPx);
}

export function stepIndexAtViewportBottom(container: HTMLElement): number | undefined {
  const containerBottom = container.getBoundingClientRect().bottom;
  const items = container.querySelectorAll<HTMLElement>("[data-step-index]");
  let found: number | undefined;
  for (const itemEl of Array.from(items)) {
    if (itemEl.getBoundingClientRect().top < containerBottom) {
      found = Number(itemEl.dataset.stepIndex);
    } else {
      break;
    }
  }
  if (found === undefined && items.length > 0) {
    found = Number(items[0].dataset.stepIndex);
  }
  return found;
}

export function isNearScrollBottom(el: HTMLElement, thresholdPx: number): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}

export function resolveFailureMessage(
  advanceMessage: string | undefined,
  logs: WorkflowLogEntry[],
): string {
  if (advanceMessage) return advanceMessage;
  const lastError = [...logs].reverse().find((l) => l.level === "error");
  return lastError?.content ?? "Failed — no error details available.";
}

export function shouldShowPreviewPane(
  runId: string | undefined,
  runStatus: string | undefined,
  runLoaded: boolean,
  isAdvancing: boolean,
): boolean {
  if (!runId) return true;
  if (!runLoaded) return true;
  if (isAdvancing) return false;
  return runStatus === "pending";
}

export function volumeIconName(muted: boolean, volume: number): string {
  if (muted || volume <= 0) return "mdi-volume-off";
  if (volume < 0.5) return "mdi-volume-medium";
  return "mdi-volume-high";
}
