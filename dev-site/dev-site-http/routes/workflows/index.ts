import path from "node:path";
import type { IRouter } from "express";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { createNewWorkflowsRouter } from "@saflib/new-workflows-http";
import { HelloWorkflowDefinition, type WorkflowDefinition } from "@saflib/new-workflows";
import drizzleWorkflows from "@saflib/drizzle-workflows";
import serviceWorkflows from "@saflib/service-workflows";
import expressWorkflows from "@saflib/express-workflows";
import monorepoWorkflows from "@saflib/monorepo-workflows";
import commanderWorkflows from "@saflib/commander-workflows";
import sdkWorkflows from "@saflib/sdk-workflows";
import openapiWorkflows from "@saflib/openapi-workflows";
import envWorkflows from "@saflib/env-workflows";
import integrationsWorkflows from "@saflib/integrations-workflows";
import emailServiceWorkflows from "@saflib/email-service-workflows";
import cronHttpWorkflows from "@saflib/cron-http-workflows";
import jobsHttpWorkflows from "@saflib/jobs-http-workflows";
import vueWorkflows from "@saflib/vue-workflows";
import { devSiteHttpStorage } from "../../context.ts";

/**
 * Every registered code workflow, ported package by package off the old
 * XState engine (see the individual `*-workflows` packages). Still
 * hand-written — no registry-building tool exists yet (same note as the
 * CLI's own registry).
 */
const registry: WorkflowDefinition<any, any>[] = [
  HelloWorkflowDefinition,
  ...drizzleWorkflows,
  ...serviceWorkflows,
  ...expressWorkflows,
  ...monorepoWorkflows,
  ...commanderWorkflows,
  ...sdkWorkflows,
  ...openapiWorkflows,
  ...envWorkflows,
  ...integrationsWorkflows,
  ...emailServiceWorkflows,
  ...cronHttpWorkflows,
  ...jobsHttpWorkflows,
  ...vueWorkflows,
];

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
  // `onDisk: true` (the default) writes into the package's own `data/`
  // folder — fine on a host checkout, but inside the docker container that
  // package dir is the bind-mounted `/repo` (see resolve-dev-site-env.sh's
  // SAFLIB_ROOT fix for the same class of problem with @saflib/templates).
  // Writing a heavily-written sqlite file onto a macOS bind mount from a
  // Linux container risks the same mmap/locking trouble as sharing
  // node_modules did (see docker-entrypoint.sh) — so docker-compose points
  // this at a container-only named volume instead, via NEW_WORKFLOWS_DB_PATH.
  const dbKey = newWorkflowsDbManager.connect(
    process.env.NEW_WORKFLOWS_DB_PATH
      ? { onDisk: process.env.NEW_WORKFLOWS_DB_PATH }
      : { onDisk: true },
  );

  return createNewWorkflowsRouter({
    dbKey,
    registry,
    // dev-site-http's own `repo_root` isn't known until *its* per-request
    // context is set up, so this is resolved fresh per request.
    defaultCwd: () => devSiteHttpStorage.getStore()!.repo_root,
    plansRoot: () => {
      const store = devSiteHttpStorage.getStore()!;
      return path.join(store.repo_root, store.product_root, "plans");
    },
  });
}
