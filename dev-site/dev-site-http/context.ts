import { AsyncLocalStorage } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type { JobTriggerMap } from "./annotate-spec-inventory-jobs.ts";

export interface DevSiteHttpContext {
  dbKey: DbKey;
  repoRoot: string;
  productRoot: string;
  mainRef: string;
  /** On-disk sqlite path when available; undefined for `:memory:`. */
  dbPath?: string;
  /**
   * Product job trigger map (caller → targets). When set, Spec inventory
   * operations are annotated with `enqueues` / `enqueuedBy`.
   */
  jobTriggerMap?: JobTriggerMap;
}

export const devSiteHttpStorage = new AsyncLocalStorage<DevSiteHttpContext>();

export function getDevSiteHttpContext(): DevSiteHttpContext {
  const ctx = devSiteHttpStorage.getStore();
  if (!ctx) {
    throw new Error("DevSiteHttpContext not set — are you outside a request?");
  }
  return ctx;
}
