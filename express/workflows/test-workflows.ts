import { InitWorkflowDefinition as ExpressInitWorkflowDefinition } from "./init.ts";
import { AddHandlerWorkflowDefinition } from "./add-handler.ts";

import {
  InitWorkflowDefinition as OpenapiInitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
} from "@saflib/openapi/workflows";

import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  PromptStepMachine,
  CwdStepMachine,
} from "@saflib/workflows";

const input = [] as const;

interface TestExpressWorkflowsContext {}

const TestExpressWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestExpressWorkflowsContext
>({
  id: "express/test-workflows",
  description:
    "Run all @saflib/express workflows with @saflib/openapi integration",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(PromptStepMachine, () => ({
      promptText: `Go over the test goals.

      This is a test of the @saflib/express workflows integrated with @saflib/openapi.

      The test goals are:
      - Initialize a new API spec package (test-spec)
      - Add a schema to the spec (users schema)
      - Add a route to the spec (list users route)
      - Initialize a new HTTP service package (test-http)
      - Add a handler for the route we created in the spec
      - Test the complete API functionality
      - Clean up`,
    })),

    // Initialize the API spec package
    step(makeWorkflowMachine(OpenapiInitWorkflowDefinition), () => ({
      name: "@test/test-spec",
      path: "./test-spec",
    })),

    // Add a users schema to the spec
    step(CwdStepMachine, () => ({
      path: "test-spec",
    })),
    step(makeWorkflowMachine(AddSchemaWorkflowDefinition), () => ({
      name: "user",
    })),

    // Add a list users route to the spec
    step(makeWorkflowMachine(AddRouteWorkflowDefinition), () => ({
      path: "routes/users/list.yaml",
    })),

    // Go back to parent directory and initialize HTTP service
    step(CwdStepMachine, () => ({
      path: ".",
    })),
    step(makeWorkflowMachine(ExpressInitWorkflowDefinition), () => ({
      name: "@test/test-http",
      path: "./test-http",
    })),

    // Add a handler for the list users route
    step(CwdStepMachine, () => ({
      path: "test-http",
    })),
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "routes/users/list",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Check that everything looks good. Consider any difficulties you had while running the above workflows and changes you might make to the definitions.

      The test should have created:
      - test-spec/ with users schema and list users route
      - test-http/ with a handler for the list users route
      - Both packages should have generated TypeScript types
      - The HTTP service should be able to handle the route defined in the spec`,
    })),
  ],
});

export default TestExpressWorkflowsDefinition;
