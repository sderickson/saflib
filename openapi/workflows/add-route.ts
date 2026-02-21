import { kebabCaseToCamelCase, kebabCaseToPascalCase } from "@saflib/utils";
import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  type ParsePathOutput,
  parsePath,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "The file path for the route (e.g., './routes/recipes/list.yaml')",
    exampleValue: "./routes/example/example.yaml",
  },
  {
    name: "urlPath",
    description:
      "The URL path for the route (e.g., '/recipes' or '/recipes/{id}')",
    exampleValue: "/example",
  },
  {
    name: "method",
    description: "The HTTP method (e.g., 'get', 'post', 'put', 'delete')",
    exampleValue: "get",
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
  urlPath: string;
  method: string;
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
      urlPath: input.urlPath,
      method: input.method,
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

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "openapi",
      prompt: `Verify the route was correctly added to openapi.yaml paths section. The entry should be:

\`\`\`yaml
  ${context.urlPath}:
    ${context.method}:
      $ref: "./routes/${context.groupName}/${context.targetName}.yaml#/${context.operationId}"
\`\`\`

If the path \`${context.urlPath}\` already exists, add the \`${context.method}\` method under the existing path entry and remove the duplicate path key.`,
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
