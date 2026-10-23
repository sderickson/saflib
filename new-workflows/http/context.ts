import type { AsyncLocalStorage } from "node:async_hooks";
import { AsyncLocalStorage as ALS } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type { WorkflowDefinition, WorkflowWorkspaceConfig } from "@saflib/new-workflows";

export interface NewWorkflowsHttpContext {
  dbKey: DbKey;
  /** Registered code workflows. No registry-building tool exists yet (Phase 2's note) — the host passes a hand-written array. */
  registry: WorkflowDefinition<any, any>[];
  /** Default cwd for new runs (e.g. dev-site's repo checkout root) — a request body's `cwd` overrides it. */
  defaultCwd: string;
  /** Folder plans (saved config-defined workflows) are read from/written to, e.g. `<repo>/<product>/plans`. Unset hosts get a clear error from the plans routes, not a crash. */
  plansRoot?: string;
  /** When set, advances and direct agent messages run in this workspace clone (see the lib's `workspace.ts`). */
  workspace?: WorkflowWorkspaceConfig;
}

export const newWorkflowsHttpStorage: AsyncLocalStorage<NewWorkflowsHttpContext> =
  new ALS();
