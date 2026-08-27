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
  PromptStepMachine,
} from "@saflib/workflows";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";

/** Spec package inside the golden product — route stub + live openapi.yaml. */
const specRoot = path.join(templatesProductRoot, "service", "spec");
const routeStub = path.join(
  specRoot,
  "routes",
  "__group-name__",
  "__target-name__.yaml",
);
/** Live openapi.yaml — route-paths area holds the stub; CopyStep upserts it. */
const openapiLive = path.join(specRoot, "openapi.yaml");

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
  {
    name: "download",
    type: "flag" as const,
    description:
      "Route returns binary (e.g. application/octet-stream or specific type)",
  },
] as const;

interface OpenApiRouteWorkflowContext extends ParsePathOutput {
  operationId: string;
  upload: boolean;
  download: boolean;
  urlPath: string;
  method: string;
}

export const OpenApiRouteWorkflowDefinition = defineWorkflow<
  typeof input,
  OpenApiRouteWorkflowContext
>({
  id: "openapi/route",

  description: "Work on an OpenAPI route",

  checklistDescription: ({ groupName, targetName }) =>
    `Work on the ${targetName} route for ${groupName} resource.`,

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
      download: input.download ?? false,
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
    route: routeStub,
    openapi: openapiLive,
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: path.join(context.targetDir),
      lineReplace: makeLineReplace(context),
      flags: { upload: context.upload, download: context.download },
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "route",
      promptMessage: `Update **${path.basename(context.copiedFiles!.route)}**.
      - Request parameters and body schemas, and response schemas should $ref existing schemas
      - Remove any unused sections (parameters, requestBody) if not needed
      - Do not specify a 400 response when the only 400s would come from OpenAPI request validation (e.g. missing required, wrong type). Do specify 400 for dynamic or business-rule failures (e.g. duplicate id, id not URL-safe, cannot remove creator).
      - If this is a list route, do not include a sort parameter unless explicitly requested.
      ${context.download ? "- For download routes the 200 response content is already set to application/octet-stream (or adjust to a specific media type e.g. application/pdf)." : ""}
      `,
    })),

    // CopyStep upserts the path stub from live openapi.yaml; merge duplicate path keys.
    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.targetDir, "openapi.yaml"),
      description: `Merge duplicate path keys for ${context.method.toUpperCase()} ${context.urlPath}`,
      transform: (content: string) => mergeOpenApiRoute(content),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npx",
      args: ["tsc", "--noEmit"],
    })),

    step(PromptStepMachine, ({ context }) => ({
      prompt: `## Audit map (when this route matters)

Routes are **not** audited by default. If this operation is security- or compliance-relevant, add an entry to the product audit map (e.g. \`saflib/base/service/audit/audit-map.ts\` or \`<product>/service/audit/audit-map.ts\`).

**Key format:** \`"${context.method.toUpperCase()} ${context.urlPath.replace(/\{([^}]+)\}/g, ":$1")}"\` — method in caps, Express-style \`:param\` segments (not \`{param}\`).

**Include in the audit map when the route:**
- Creates, updates, or deletes durable user/org data
- Grants or revokes access (roles, site-admin, OAuth tokens, sharing)
- Runs destructive or irreversible actions (delete matter, cancel job, seal audit log)
- Is an admin-only or privileged mutation you would want in a forensic timeline

**Skip audit map entries for:**
- Idempotent reads (GET/list), health checks, static config
- High-volume webhooks or polling endpoints (unless compliance requires every delivery)
- Internal-only helpers with no user-visible effect

**Options on each entry:**
- \`failClosed: true\` — for destructive routes: call \`appendFailClosed*HttpAuditIfRequired\` in the handler **after** the mutation succeeds and **before** sending 2xx; client gets **503** if audit append fails
- \`alsoEmitFor\` — extra \`resource_type\` rows (same \`event_type\`, shared \`request_id\`)
- \`outcomeOverride\` — custom status → outcome mapping (rare)

Run the product audit-map unit test after editing the map. See \`audit-map.test.ts\` beside the map file.`,
    })),
  ],
});

/**
 * Merges duplicate path keys in the route-paths workflow area (same URL,
 * different methods) after CopyStep upserts a new path block from the stub.
 */
export function mergeOpenApiRoute(content: string): string {
  const lines = content.split("\n");
  const areaStart = lines.findIndex((l) =>
    l.includes("BEGIN WORKFLOW AREA route-paths FOR openapi/route"),
  );
  const areaEnd = lines.findIndex(
    (l, i) => i > areaStart && l.includes("END WORKFLOW AREA"),
  );
  if (areaStart === -1 || areaEnd === -1) {
    return content;
  }

  const pathIndent = "  ";
  const methodIndent = "    ";
  const refIndent = "      ";

  interface PathBlock {
    urlPath: string;
    methods: { method: string; ref: string }[];
  }
  const blocks: PathBlock[] = [];
  let current: PathBlock | null = null;

  for (let i = areaStart + 1; i < areaEnd; i++) {
    const line = lines[i];
    const pathMatch = line.match(/^(\s{2})(\/.+):$/);
    if (pathMatch) {
      current = { urlPath: pathMatch[2], methods: [] };
      blocks.push(current);
      continue;
    }
    const methodMatch = line.match(/^\s{4}(\w+):$/);
    if (methodMatch && current) {
      const nextLine = lines[i + 1] || "";
      const refMatch = nextLine.match(/^\s+\$ref:\s*"(.+)"$/);
      if (refMatch) {
        current.methods.push({ method: methodMatch[1], ref: refMatch[1] });
        i++;
      }
      continue;
    }
  }

  const merged = new Map<string, { method: string; ref: string }[]>();
  for (const block of blocks) {
    const existing = merged.get(block.urlPath) || [];
    for (const m of block.methods) {
      if (!existing.some((e) => e.method === m.method)) {
        existing.push(m);
      }
    }
    merged.set(block.urlPath, existing);
  }

  const newAreaLines: string[] = [];
  for (const [urlPath, methods] of merged) {
    newAreaLines.push(`${pathIndent}${urlPath}:`);
    for (const { method, ref } of methods) {
      newAreaLines.push(`${methodIndent}${method}:`);
      newAreaLines.push(`${refIndent}$ref: "${ref}"`);
    }
  }

  return [
    ...lines.slice(0, areaStart + 1),
    ...newAreaLines,
    ...lines.slice(areaEnd),
  ].join("\n");
}
