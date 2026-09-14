#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { setupContext } from "@saflib/commander";
import { setServiceName } from "@saflib/node";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { HelloWorkflowDefinition } from "@saflib/new-workflows";
import { AddDrizzleQueryWorkflowDefinition } from "@saflib/drizzle-workflows";
import { runNewWorkflowCli } from "../../index.ts";

// Hand-written registry for Phase 2 dogfooding — a real registry-building
// tool (mirroring `workflows/add-workflow`) is Phase 5 territory.
const registry = [HelloWorkflowDefinition, AddDrizzleQueryWorkflowDefinition];

setServiceName("new-workflow");

// A local dev tool, not a server: default to a real on-disk db under
// new-workflows/db/data/ so runs persist across CLI invocations, without
// requiring the caller to configure deployment env vars first.
process.env.DEPLOYMENT_NAME ??= "local";
process.env.ALLOW_DB_CREATION ??= "true";

setupContext({ serviceName: "new-workflow" }, () => {
  const dbKey = newWorkflowsDbManager.connect({ onDisk: true });
  void runNewWorkflowCli(registry, dbKey);
});
