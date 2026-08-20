import {
  defineWorkflow,
  makeWorkflowMachine,
  step,
  CdStepMachine,
  CommandStepMachine,
} from "@saflib/workflows";
import { InitProductWorkflowDefinition } from "@saflib/product/workflows";
import {
  OpenApiSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
} from "@saflib/openapi/workflows";
import {
  UpdateSchemaWorkflowDefinition,
  AddDrizzleQueryWorkflowDefinition,
} from "@saflib/drizzle/workflows";
import { AddHandlerWorkflowDefinition } from "@saflib/express/workflows";
import {
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
} from "@saflib/sdk/workflows";
import { AddSpaViewWorkflowDefinition } from "@saflib/vue/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** Disposable product name — copy of base, never committed. */
const PRODUCT = "tmp";

const input = [] as const;
interface TestPhase1VerticalSliceContext {}

/**
 * Replacement for the old `test-all-workflows` script CI.
 *
 * Instead of initializing every SPA/service stack from scratch (brittle + slow),
 * copy the golden product via `product/init`, run the Phase 1 vertical-slice
 * add-* workflows in script mode (CopyStep + generate; validation typecheck/test
 * commands are skipped in script mode), assert scaffold files exist, typecheck
 * packages that should still pass, then delete the copy.
 *
 * Usage:
 *   npm exec saf-workflow run-scripts ./workflows-cli/test-phase1-vertical-slice.ts
 */
export const TestPhase1VerticalSliceDefinition = defineWorkflow<
  typeof input,
  TestPhase1VerticalSliceContext
>({
  id: "saflib/test-phase1-vertical-slice",
  description:
    "Copy base → tmp, run Phase 1 vertical-slice workflows, typecheck, clean up.",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(makeWorkflowMachine(InitProductWorkflowDefinition), () => ({
      name: PRODUCT,
      domain: "temporary.com",
      productOnly: true,
    })),

    // --- openapi: schema + route ---
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/service/spec`,
    })),
    step(makeWorkflowMachine(OpenApiSchemaWorkflowDefinition), () => ({
      name: "todo",
    })),
    step(makeWorkflowMachine(OpenApiRouteWorkflowDefinition), () => ({
      path: "./routes/todo/list.yaml",
      urlPath: "/todos",
      method: "get",
    })),

    // --- drizzle: table + query ---
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/service/db`,
    })),
    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "./schemas/todo.ts",
    })),
    step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
      path: "./queries/todo/list.ts",
    })),

    // --- express: handler ---
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/service/http`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
    step(makeWorkflowMachine(AddHandlerWorkflowDefinition), () => ({
      path: "./handlers/todo/list.ts",
    })),

    // --- sdk: query + mutation ---
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/service/sdk`,
    })),
    step(makeWorkflowMachine(AddSdkQueryWorkflowDefinition), () => ({
      path: "./requests/todo/list.ts",
      urlPath: "/todos",
      method: "get",
    })),
    step(makeWorkflowMachine(AddSdkMutationWorkflowDefinition), () => ({
      path: "./requests/todo/create.ts",
      urlPath: "/todos",
      method: "post",
    })),

    // --- vue: page on the concrete app SPA ---
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/clients/app`,
    })),
    step(makeWorkflowMachine(AddSpaViewWorkflowDefinition), () => ({
      path: "./pages/todos-list",
      urlPath: "/todos",
    })),

    // Assert scaffolds landed (script mode skips Update/Prompt).
    step(CdStepMachine, () => ({
      path: saflibRoot,
    })),
    step(CommandStepMachine, () => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        "./workflows-cli/assert-phase1-scaffold.ts",
        PRODUCT,
      ],
    })),

    // Typecheck packages that should still pass with scaffold + @ts-nocheck stubs.
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/service/spec`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      forceInScript: true,
    })),
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/service/db`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      forceInScript: true,
    })),
    step(CdStepMachine, () => ({
      path: `./${PRODUCT}/clients/links`,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      forceInScript: true,
    })),

    // Drop the disposable product and any scaffold files product/init may
    // have written into the saflib package root.
    step(CdStepMachine, () => ({
      path: saflibRoot,
    })),
    step(CommandStepMachine, () => ({
      command: "rm",
      args: [
        "-rf",
        PRODUCT,
        ".github/workflows/playwright.yml",
        ".github/workflows/typecheck.yml",
        ".github/workflows/push.yml",
        ".github/actions/setup-node-deps",
        "deploy",
      ],
    })),
    step(CommandStepMachine, () => ({
      command: "node",
      args: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        "./workflows-cli/cleanup-product-init-artifacts.ts",
      ],
    })),
  ],
});

export default TestPhase1VerticalSliceDefinition;
