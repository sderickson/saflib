import { AsyncLocalStorage } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";

export interface DevSiteHttpContext {
  dbKey: DbKey;
  repoRoot: string;
  productRoot: string;
  mainRef: string;
}

export const devSiteHttpStorage = new AsyncLocalStorage<DevSiteHttpContext>();

export function getDevSiteHttpContext(): DevSiteHttpContext {
  const ctx = devSiteHttpStorage.getStore();
  if (!ctx) {
    throw new Error("DevSiteHttpContext not set — are you outside a request?");
  }
  return ctx;
}
