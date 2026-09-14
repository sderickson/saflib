import type { AsyncLocalStorage } from "node:async_hooks";
import { AsyncLocalStorage as ALS } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type { WorkflowDefinition } from "@saflib/new-workflows";

export interface NewWorkflowsHttpContext {
  dbKey: DbKey;
  /** Registered code workflows. No registry-building tool exists yet (Phase 2's note) — the host passes a hand-written array. */
  registry: WorkflowDefinition<any, any>[];
  /** Default cwd for new runs (e.g. dev-site's repo checkout root) — a request body's `cwd` overrides it. */
  defaultCwd: string;
}

export const newWorkflowsHttpStorage: AsyncLocalStorage<NewWorkflowsHttpContext> =
  new ALS();
