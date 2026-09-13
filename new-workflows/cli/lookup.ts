import { resolve, extname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import {
  validateWorkflowConfigBody,
  compileConfigWorkflow,
  type WorkflowDefinition,
} from "@saflib/new-workflows";
import type { WorkflowConfigBody } from "@saflib/new-workflows-spec";

const CONFIG_EXTENSIONS = new Set([".json", ".yaml", ".yml"]);

/**
 * Same dual lookup as the old CLI's `loadWorkflowDefinition`, plus a third
 * form: a `.json`/`.yaml`/`.yml` path is a config-defined workflow — no
 * TypeScript required. A bare id looks up the in-memory registry; a
 * `./`-prefixed or `.ts`-suffixed path dynamic-imports a code workflow
 * file's default export. The path forms are what make dogfooding a new
 * workflow (code or config) possible without a registry-scaffolding tool.
 */
export async function loadWorkflowDefinition(
  idOrPath: string,
  registry: WorkflowDefinition<any, any>[],
): Promise<WorkflowDefinition<any, any>> {
  if (CONFIG_EXTENSIONS.has(extname(idOrPath))) {
    return loadConfigWorkflowDefinition(idOrPath, registry);
  }

  if (idOrPath.startsWith("./") || idOrPath.endsWith(".ts")) {
    const resolvedPath = resolve(process.cwd(), idOrPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }
    const module = await import(resolvedPath);
    const def = module.default;
    if (!def || typeof def.id !== "string" || !Array.isArray(def.steps)) {
      throw new Error(`Default export from ${resolvedPath} is not a valid WorkflowDefinition`);
    }
    return def;
  }

  const def = registry.find((w) => w.id === idOrPath);
  if (!def) {
    const known = registry.map((w) => w.id).join(", ") || "(none registered)";
    throw new Error(`Workflow "${idOrPath}" not found. Known workflows: ${known}`);
  }
  return def;
}

async function loadConfigWorkflowDefinition(
  idOrPath: string,
  registry: WorkflowDefinition<any, any>[],
): Promise<WorkflowDefinition<any, any>> {
  const resolvedPath = resolve(process.cwd(), idOrPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }
  const contents = readFileSync(resolvedPath, "utf-8");
  const raw = extname(resolvedPath) === ".json" ? JSON.parse(contents) : parseYaml(contents);

  const { result: body, error } = validateWorkflowConfigBody(raw);
  if (error) throw error;

  const resolvedWorkflows = await resolveCallWorkflowTargets(body!, registry);
  return compileConfigWorkflow(idOrPath, body!, resolvedWorkflows);
}

/** Pre-resolves every `call-workflow` step's `workflowId`, recursively (a referenced config can itself have `call-workflow` steps). */
async function resolveCallWorkflowTargets(
  body: WorkflowConfigBody,
  registry: WorkflowDefinition<any, any>[],
): Promise<Record<string, WorkflowDefinition<any, any>>> {
  const resolved: Record<string, WorkflowDefinition<any, any>> = {};
  for (const configStep of body.steps) {
    if (configStep.kind !== "call-workflow") continue;
    if (resolved[configStep.workflowId]) continue;
    resolved[configStep.workflowId] = await loadWorkflowDefinition(
      configStep.workflowId,
      registry,
    );
  }
  return resolved;
}
