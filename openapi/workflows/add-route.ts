import { kebabCaseToCamelCase, kebabCaseToPascalCase } from "@saflib/utils";
import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
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

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.targetDir, "openapi.yaml"),
      description: `Merge ${context.method.toUpperCase()} ${context.urlPath} into openapi.yaml paths`,
      transform: (content: string) => mergeOpenApiRoute(content),
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

/**
 * Merges a route entry into the openapi.yaml paths section, handling duplicate
 * path keys that occur when the CopyStepMachine's workflow area inserts a new
 * block for the same URL path (different method).
 *
 * Scans lines between the route-paths workflow area markers. If the urlPath
 * already exists, the new method+$ref is added under the existing path key and
 * the duplicate path key block is removed. If it doesn't exist, the content is
 * left as-is (already inserted by CopyStepMachine).
 */
function mergeOpenApiRoute(content: string): string {
  const lines = content.split("\n");
  const areaStart = lines.findIndex((l) =>
    l.includes("BEGIN WORKFLOW AREA route-paths FOR openapi/add-route"),
  );
  const areaEnd = lines.findIndex((l) =>
    l.includes("END WORKFLOW AREA") && lines.indexOf(l) > areaStart,
  );
  if (areaStart === -1 || areaEnd === -1) {
    return content;
  }

  const pathIndent = "  ";
  const methodIndent = "    ";
  const refIndent = "      ";

  // Parse path blocks within the workflow area
  interface PathBlock {
    urlPath: string;
    methods: { method: string; ref: string }[];
  }
  const blocks: PathBlock[] = [];
  let current: PathBlock | null = null;

  for (let i = areaStart + 1; i < areaEnd; i++) {
    const line = lines[i];
    // Match a path key like "  /recipes:" or "  /recipes/{id}:"
    const pathMatch = line.match(/^(\s{2})(\/.+):$/);
    if (pathMatch) {
      current = { urlPath: pathMatch[2], methods: [] };
      blocks.push(current);
      continue;
    }
    // Match a method key like "    get:" or "    post:"
    const methodMatch = line.match(/^\s{4}(\w+):$/);
    if (methodMatch && current) {
      const nextLine = lines[i + 1] || "";
      const refMatch = nextLine.match(/^\s+\$ref:\s*"(.+)"$/);
      if (refMatch) {
        current.methods.push({ method: methodMatch[1], ref: refMatch[1] });
        i++; // skip the $ref line
      }
      continue;
    }
  }

  // Merge duplicate path keys
  const merged = new Map<string, { method: string; ref: string }[]>();
  for (const block of blocks) {
    const existing = merged.get(block.urlPath) || [];
    existing.push(...block.methods);
    merged.set(block.urlPath, existing);
  }

  // Rebuild the area content
  const newAreaLines: string[] = [];
  for (const [urlPath, methods] of merged) {
    newAreaLines.push(`${pathIndent}${urlPath}:`);
    for (const { method, ref } of methods) {
      newAreaLines.push(`${methodIndent}${method}:`);
      newAreaLines.push(`${refIndent}$ref: "${ref}"`);
    }
  }

  // Replace the area content
  const result = [
    ...lines.slice(0, areaStart + 1),
    ...newAreaLines,
    ...lines.slice(areaEnd),
  ];
  return result.join("\n");
}
