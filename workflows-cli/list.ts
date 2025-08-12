// Entry point for @tools/workflows
import type { ConcreteWorkflow, WorkflowMeta } from "@saflib/workflows";
import metaWorkflows from "@saflib/workflows/workflows";
import processWorkflows from "@saflib/processes/workflows";
import drizzleWorkflows from "@saflib/drizzle-sqlite3/workflows";
import openapiWorkflows from "@saflib/openapi/workflows";
import monorepoWorkflows from "@saflib/monorepo/workflows";
import vueSpaWorkflows from "@saflib/vue-spa/workflows";
import expressWorkflows from "@saflib/express/workflows";
import grpcSpecsWorkflows from "@saflib/grpc-specs/workflows";
import grpcNodeWorkflows from "@saflib/grpc-node/workflows";
import nodeXstateWorkflows from "@saflib/node-xstate/workflows";
import emailWorkflows from "@saflib/email-node/workflows";
import { concreteWorkflowToMeta } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  ...metaWorkflows,
  ...monorepoWorkflows,
  ...processWorkflows,
  ...drizzleWorkflows,
  ...openapiWorkflows,
  ...expressWorkflows,
  ...vueSpaWorkflows,
  ...grpcSpecsWorkflows,
  ...grpcNodeWorkflows,
  ...nodeXstateWorkflows,
  ...emailWorkflows,
];

export const workflows: WorkflowMeta[] = workflowClasses.map(
  concreteWorkflowToMeta,
);
