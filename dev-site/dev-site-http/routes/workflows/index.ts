import type { IRouter } from "express";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createNewWorkflowsRouter } from "@saflib/new-workflows-http";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import { AddDrizzleQueryWorkflowDefinition } from "@saflib/drizzle-workflows";
import { devSiteHttpStorage } from "../../context.ts";

// A local dev tool, not a server: default to a real on-disk db so runs
// persist across dev-site restarts, without requiring deployment env vars
// to be configured first (same defaults the new-workflows CLI uses).
process.env.DEPLOYMENT_NAME ??= "local";
process.env.ALLOW_DB_CREATION ??= "true";

/**
 * Mounts `new-workflows-http`'s router as monolith chrome — the workflows
 * engine's HTTP surface lives here, not as its own service (see
 * `new-workflows/plans/spec.md`'s Phase 4 notes on why). Hand-written
 * registry: no registry-building tool exists yet (same note as the CLI's).
 */
export function createWorkflowsRouter(): IRouter {
  const dbKey = newWorkflowsDbManager.connect({ onDisk: true });

  return createNewWorkflowsRouter({
    dbKey,
    registry: [HelloWorkflowDefinition, AddDrizzleQueryWorkflowDefinition],
    // dev-site-http's own `repo_root` isn't known until *its* per-request
    // context is set up, so this is resolved fresh per request.
    defaultCwd: () => devSiteHttpStorage.getStore()!.repo_root,
  });
}
