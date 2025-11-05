import { defineWorkflow, makeWorkflowMachine, step } from "@saflib/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";
import { CwdStepMachine } from "@saflib/workflows";
import {
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
} from "@saflib/openapi/workflows";
import {
  UpdateSchemaWorkflowDefinition,
  AddQueryWorkflowDefinition,
} from "@saflib/drizzle/workflows";
import { AddHandlerWorkflowDefinition } from "@saflib/express/workflows";

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
    // Covers various "init" workflows
    step(makeWorkflowMachine(InitServiceWorkflowDefinition), () => ({
      name: "tmp-service",
      path: "./services/tmp",
    })),

    // Test "@saflib/openapi workflows"
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

    // Test @saflib/drizzle workflows
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-db",
    })),
    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "./schemas/users.ts",
    })),
    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "./queries/users/list.ts",
    })),

    // Test @saflib/express workflows
    step(CwdStepMachine, () => ({
      path: "./services/tmp/tmp-http",
    })),
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./routes/users/list.ts",
    })),
  ],
});

export default TestAllWorkflowsDefinition;
