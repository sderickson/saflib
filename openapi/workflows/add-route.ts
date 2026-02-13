import { kebabCaseToCamelCase, kebabCaseToPascalCase } from "@saflib/utils";
import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  PromptStepMachine,
  type ParsePathOutput,
  parsePath,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description: "The path for the route (e.g., 'users' or 'products')",
    exampleValue: "./routes/example/example.yaml",
  },
  {
    name: "upload",
    type: "flag" as const,
    description: "Include file upload (e.g. multipart) in the route",
  },
] as const;

interface AddRouteWorkflowContext extends ParsePathOutput {
  operationId: string;
  upload: boolean;
}

export const AddRouteWorkflowDefinition = defineWorkflow<
  typeof input,
  AddRouteWorkflowContext
>({
  id: "openapi/add-route",

  description: "Add a new route to an existing OpenAPI specification package",

  checklistDescription: ({ groupName, targetName }) =>
    `Add a new ${targetName} route for ${groupName} resource to the OpenAPI specification.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const context = {
      ...parsePath(input.path, {
        requiredSuffix: ".yaml",
        cwd: input.cwd,
        requiredPrefix: "./routes/",
      }),
      targetDir: input.cwd,
      upload: input.upload ?? false,
    };
    const operationId =
      kebabCaseToCamelCase(context.targetName.split(".")[0]) +
      kebabCaseToPascalCase(context.groupName);

    return {
      ...context,
      operationId,
    };
  },

  templateFiles: {
    route: path.join(sourceDir, "routes/__group-name__/__target-name__.yaml"),
    openapi: path.join(sourceDir, "openapi.yaml"),
    distTypes: path.join(sourceDir, "dist/openapi.d.ts"),
    distJson: path.join(sourceDir, "dist/openapi.json"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: path.join(context.targetDir),
      lineReplace: makeLineReplace(context),
      flags: { upload: context.upload },
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "route",
      promptMessage: `Update **${path.basename(context.copiedFiles!.route)}**. Resolve all TODOs.
      
      Replace the template properties with actual route definition:
      - Define request parameters and body schemas using $ref to existing schemas
      - Define response schemas using $ref to existing schemas (including error.yaml for error responses)
      - Remove any unused sections (parameters, requestBody) if not needed
      - Do not specify a 400 response. The openapi validator is the only source of these.
      - If this is a list route, do not include a sort parameter unless explicitly requested.
      `,
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
