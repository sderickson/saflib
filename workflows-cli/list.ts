// Entry point for @tools/workflows
import metaWorkflows from "@saflib/workflows/workflows";
import processWorkflows from "@saflib/processes/workflows";
import drizzleWorkflows from "@saflib/drizzle/workflows";
import openapiWorkflows from "@saflib/openapi/workflows";
import monorepoWorkflows from "@saflib/monorepo/workflows";
import vueSpaWorkflows from "@saflib/vue/workflows";
import expressWorkflows from "@saflib/express/workflows";
import emailWorkflows from "@saflib/email/workflows";
import envWorkflows from "@saflib/env/workflows";
import commanderWorkflows from "@saflib/commander/workflows";
import sdkWorkflows from "@saflib/sdk/workflows";
import serviceWorkflows from "../service/workflows/index.ts";
import identityWorkflows from "@saflib/identity/workflows";
import grpcWorkflows from "@saflib/grpc/workflows";
import cronWorkflows from "@saflib/cron/workflows";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowClasses: WorkflowDefinition[] = [
  // workflows/add-workflow HOOK - do not remove this line
  // TEMP: tested workflows
  ...serviceWorkflows,
  ...openapiWorkflows,
  ...drizzleWorkflows,
  ...expressWorkflows,
  ...emailWorkflows,
  ...envWorkflows,
  ...monorepoWorkflows,
  ...commanderWorkflows,
  ...grpcWorkflows,

  // TEMP: untested workflows
  ...metaWorkflows,
  ...processWorkflows,
  ...vueSpaWorkflows,
  ...sdkWorkflows,
  ...identityWorkflows,
  ...cronWorkflows,
];

export const workflows = workflowClasses;
