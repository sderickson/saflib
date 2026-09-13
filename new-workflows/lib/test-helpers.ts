import type { LogChunk, WorkflowContext, WorkflowRunMode } from "./types.ts";

/** Builds a minimal `WorkflowContext` for step-primitive unit tests. */
export function makeTestContext(
  overrides: Partial<WorkflowContext> & { mode: WorkflowRunMode },
): { ctx: WorkflowContext; chunks: LogChunk[] } {
  const chunks: LogChunk[] = [];
  const ctx: WorkflowContext = {
    runId: "test-run",
    workflowId: "test/workflow",
    cwd: "/tmp",
    originalWorkingDirectory: "/tmp",
    copiedFiles: {},
    isResume: false,
    log: (chunk) => chunks.push(chunk),
    ...overrides,
  };
  return { ctx, chunks };
}
