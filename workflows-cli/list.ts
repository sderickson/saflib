// Entry point for @tools/workflows
import type { ConcreteWorkflow, WorkflowMeta } from "@saflib/workflows";
import metaWorkflows from "@saflib/workflows/workflows";
import processWorkflows from "@saflib/processes/workflows";
import drizzleWorkflows from "@saflib/drizzle/workflows";
import openapiWorkflows from "@saflib/openapi/workflows";
import monorepoWorkflows from "@saflib/monorepo/workflows";
import vueSpaWorkflows from "@saflib/vue/workflows";
import expressWorkflows from "@saflib/express/workflows";
import grpcSpecsWorkflows from "@saflib/grpc-specs/workflows";
import grpcNodeWorkflows from "@saflib/grpc/workflows";
import emailWorkflows from "@saflib/email/workflows";
import envWorkflows from "@saflib/env/workflows";
import commanderWorkflows from "@saflib/commander/workflows";
import sdkWorkflows from "@saflib/sdk/workflows";
import { getPackageName } from "@saflib/workflows";

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
  ...emailWorkflows,
  ...envWorkflows,
  ...commanderWorkflows,
  ...sdkWorkflows,
];

function concreteWorkflowToMeta(workflow: ConcreteWorkflow): WorkflowMeta {
  const stubWorkflow = new workflow();
  if (!stubWorkflow.sourceUrl) {
    throw new Error(
      `Workflow ${stubWorkflow.name} must have a sourceUrl property.`,
    );
  }
  return {
    name: stubWorkflow.name,
    description: stubWorkflow.description,
    cliArguments: stubWorkflow.cliArguments,
    packageName: getPackageName(stubWorkflow.sourceUrl),
    Workflow: workflow,
  };
}

export const workflows: WorkflowMeta[] = workflowClasses.map(
  concreteWorkflowToMeta,
);
