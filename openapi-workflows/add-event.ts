import {
  defineWorkflow,
  step,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  parsePackageName,
  parsePath,
  getPackageName,
  makeLineReplace,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import path from "node:path";
import { templatesProductRoot } from "@saflib/templates";

const sourceDir = path.join(templatesProductRoot, "service", "spec");

interface AddEventInput {
  path: string;
}

interface AddEventWorkflowContext extends ParsePackageNameOutput, ParsePathOutput {
  eventName: string;
  targetDir: string;
}

/**
 * Ported from `openapi/workflows/add-event.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState. Self-contained; not tangled with `init.ts`.
 */
export const AddEventWorkflowDefinition = defineWorkflow<
  AddEventInput,
  AddEventWorkflowContext
>({
  id: "openapi/add-event",

  description: "Add a new event to an existing OpenAPI specification package",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The path for the event (e.g., 'product_view' or 'cart_add')",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    const context = {
      ...parsePackageName(getPackageName(cwd), {}),
      ...parsePath(input.path, {
        requiredSuffix: ".yaml",
        cwd,
        requiredPrefix: "./events/",
      }),
      targetDir: cwd,
    };
    const eventName = context.targetName.replace(".yaml", "");

    return {
      ...context,
      eventName,
    };
  },

  steps: [
    step<CopyStepInput, AddEventWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        event: path.join(sourceDir, "events/__target_name__.yaml"),
        index: path.join(sourceDir, "events/index.yaml"),
        openapi: path.join(sourceDir, "openapi.yaml"),
        distTypes: path.join(sourceDir, "dist/openapi.d.ts"),
        distJson: path.join(sourceDir, "dist/openapi.json"),
      },
      name: context.targetName,
      targetDir: path.join(context.targetDir),
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, AddEventWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "event",
      prompt: `Update **${context.eventName}.yaml**. Resolve all TODOs.

      Replace the template properties with actual event definition.
      `,
    })),

    step<CommandStepInput, AddEventWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step<CommandStepInput, AddEventWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "tsc", "--", "--noEmit"],
    })),
  ],
});

export default AddEventWorkflowDefinition;
