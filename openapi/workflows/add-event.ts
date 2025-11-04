import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description: "The path for the event (e.g., 'product_view' or 'cart_add')",
    exampleValue: "./events/example_event.yaml",
  },
] as const;

interface AddEventWorkflowContext
  extends ParsePackageNameOutput,
    ParsePathOutput {
  eventName: string;
}

export const AddEventWorkflowDefinition = defineWorkflow<
  typeof input,
  AddEventWorkflowContext
>({
  id: "openapi/add-event",

  description: "Add a new event to an existing OpenAPI specification package",

  checklistDescription: ({ groupName, targetName }) =>
    `Add a new ${targetName} event for ${groupName} resource to the OpenAPI specification.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const context = {
      ...parsePackageName(getPackageName(input.cwd), {}),
      ...parsePath(input.path, {
        requiredSuffix: ".yaml",
        cwd: input.cwd,
        requiredPrefix: "./events/",
      }),
      targetDir: input.cwd,
    };
    const eventName = context.targetName.replace(".yaml", "");

    return {
      ...context,
      eventName,
    };
  },

  templateFiles: {
    event: path.join(sourceDir, "events/__target_name__.yaml"),
    index: path.join(sourceDir, "events/index.yaml"),
    openapi: path.join(sourceDir, "openapi.yaml"),
    distTypes: path.join(sourceDir, "dist/openapi.d.ts"),
    distJson: path.join(sourceDir, "dist/openapi.json"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  manageVersionControl: true,

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: path.join(context.targetDir),
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "event",
      promptMessage: `Update **${path.basename(context.copiedFiles!.event)}**. Resolve all TODOs.
      
      Replace the template properties with actual event definition:
      - Add any event-specific context
      - Add the event to the adjacent index.yaml file in the oneOf array. Reference the event file using $ref.
      `,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-specs", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npx",
      args: ["tsc", "--noEmit"],
    })),
  ],
});
