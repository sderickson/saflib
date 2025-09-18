import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  PromptStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates/routes");

const input = [
  {
    name: "path",
    description: "The path for the route (e.g., 'users' or 'products')",
    exampleValue: "routes/example-resource/example-route",
  },
] as const;

interface AddRouteWorkflowContext {
  resource: string;
  targetDir: string;
  operationId: string;
}

export const AddRouteWorkflowDefinition = defineWorkflow<
  typeof input,
  AddRouteWorkflowContext
>({
  id: "openapi/add-route",

  description: "Add a new route to an existing OpenAPI specification package",

  checklistDescription: ({ resource, operationId }) =>
    `Add a new ${operationId} route for ${resource} resource to the OpenAPI specification.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const resource = path.basename(input.path);
    let p = input.path;
    if (!p.startsWith("routes")) {
      p = "routes/" + p;
    }
    if (!p.endsWith(".yaml")) {
      p = p + ".yaml";
    }
    let targetDir = path.dirname(path.join(input.cwd, p));
    const name = path.basename(p).split(".")[0];
    console.log({ targetDir, resource, name });

    return {
      resource,
      targetDir,
      operationId: name,
    };
  },

  templateFiles: {
    route: path.join(sourceDir, "template-file.yaml"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.operationId,
      targetDir: path.join(context.targetDir),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "route",
      promptMessage: `Update **${path.basename(context.copiedFiles!.route)}**. Resolve all TODOs.
      
      Replace the template properties with actual route definition:
      - Define request parameters and body schemas using $ref to existing schemas
      - Define response schemas using $ref to existing schemas (including error.yaml for error responses)
      - Remove any unused sections (parameters, requestBody) if not needed`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add the route to the openapi.yaml file in the paths section. Reference the route file using $ref.`,
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
