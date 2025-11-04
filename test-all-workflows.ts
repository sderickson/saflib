import { defineWorkflow, makeWorkflowMachine, step } from "@saflib/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import { CwdStepMachine } from "@saflib/workflows";
import {
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
} from "@saflib/openapi/workflows";

const input = [] as const;
interface TestAllWorkflowsContext {}

export const TestAllWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestAllWorkflowsContext
>({
  id: "saflib/test-all-workflows",
  description: "Run all @saflib workflows.",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(makeWorkflowMachine(InitServiceWorkflowDefinition), () => ({
      name: "tmp-service",
      path: "./services/tmp",
    })),
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-spec",
    })),
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "user",
    })),
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "./routes/users/list.yaml",
    })),
    step(makeWorkflowMachine(AddEventWorkflowDefinition), () => ({
      path: "./events/signup.yaml",
    })),
    /*
    Workflows TODO:
    spec 
    drizzle
    express
    sdk
    */
  ],
});

export default TestAllWorkflowsDefinition;
