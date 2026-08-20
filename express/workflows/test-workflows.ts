import { ExpressInitWorkflowDefinition } from "./init.ts";
import { AddHandlerWorkflowDefinition } from "./add-handler.ts";

import {
  OpenapiInitWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
} from "@saflib/openapi/workflows";

import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  PromptStepMachine,
  CdStepMachine,
} from "@saflib/workflows";

const input = [] as const;

interface TestExpressWorkflowsContext {}

/**
 * Manual integration check for openapi + express offshoot inits.
 * Expects cwd to be a product root already created by product/init.
 */
const TestExpressWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestExpressWorkflowsContext
>({
  id: "express/test-workflows",
  description:
    "Run openapi/init + express/init offshoot workflows (product root cwd)",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(PromptStepMachine, () => ({
      promptText: `Go over the test goals.

      This exercises domain offshoot inits against an existing product (from product/init):

      - openapi/init for offshoot "demo" (spec + weave)
      - openapi/schema + openapi/route inside the offshoot spec
      - express/init for offshoot "demo" (http + weave)
      - express/add-handler inside the offshoot http package`,
    })),

    step(makeWorkflowMachine(OpenapiInitWorkflowDefinition), () => ({
      name: "demo",
    })),

    step(CdStepMachine, () => ({
      path: "demo/spec",
    })),
    step(makeWorkflowMachine(OpenApiSchemaWorkflowDefinition), () => ({
      name: "user",
    })),
    step(makeWorkflowMachine(OpenApiRouteWorkflowDefinition), () => ({
      path: "routes/users/list.yaml",
      urlPath: "/users",
      method: "get",
    })),

    step(CdStepMachine, () => ({
      path: "../..",
    })),
    step(makeWorkflowMachine(ExpressInitWorkflowDefinition), () => ({
      name: "demo",
    })),

    step(CdStepMachine, () => ({
      path: "demo/http",
    })),
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./handlers/users/list.ts",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Check that everything looks good.

      Expected:
      - demo/spec with users schema + list route, woven into service/spec/openapi.yaml
      - demo/http with a users list handler, woven into service/http/http.ts`,
    })),
  ],
});

export default TestExpressWorkflowsDefinition;
