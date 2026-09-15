import { resolve, extname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { validateWorkflowConfigBody } from "./config/validate.ts";
import { compileConfigWorkflow } from "./config/compile.ts";
import type { WorkflowDefinition } from "./types.ts";
import type { WorkflowConfigBody } from "@saflib/new-workflows-spec";

const CONFIG_EXTENSIONS = new Set([".json", ".yaml", ".yml"]);

/**
 * Shared by the CLI and HTTP: a bare id looks up the in-memory registry; a
 * `./`-prefixed or `.ts`-suffixed path dynamic-imports a code workflow
 * file's default export; a `.json`/`.yaml`/`.yml` path is a config-defined
 * workflow (a saved plan) — no TypeScript required. The path forms are
 * what make dogfooding a new workflow (code or config) possible without a
 * registry-scaffolding tool, and what let a saved plan run the same way a
 * registered workflow does.
 */
export async function loadWorkflowDefinition(
  idOrPath: string,
  registry: WorkflowDefinition<any, any>[],
  opts: { cwd?: string } = {},
): Promise<WorkflowDefinition<any, any>> {
  const cwd = opts.cwd ?? process.cwd();

  if (CONFIG_EXTENSIONS.has(extname(idOrPath))) {
    return loadConfigWorkflowDefinition(idOrPath, registry, cwd);
  }

  if (idOrPath.startsWith("./") || idOrPath.endsWith(".ts")) {
    const resolvedPath = resolve(cwd, idOrPath);
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
  cwd: string,
): Promise<WorkflowDefinition<any, any>> {
  const resolvedPath = resolve(cwd, idOrPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }
  const contents = readFileSync(resolvedPath, "utf-8");
  const raw = extname(resolvedPath) === ".json" ? JSON.parse(contents) : parseYaml(contents);

  const { result: body, error } = validateWorkflowConfigBody(raw);
  if (error) throw error;

  const resolvedWorkflows = await resolveCallWorkflowTargets(body!, registry, cwd);
  return compileConfigWorkflow(idOrPath, body!, resolvedWorkflows);
}

/** Pre-resolves every `call-workflow` step's `workflowId`, recursively (a referenced config can itself have `call-workflow` steps). */
async function resolveCallWorkflowTargets(
  body: WorkflowConfigBody,
  registry: WorkflowDefinition<any, any>[],
  cwd: string,
): Promise<Record<string, WorkflowDefinition<any, any>>> {
  const resolved: Record<string, WorkflowDefinition<any, any>> = {};
  for (const configStep of body.steps) {
    if (configStep.kind !== "call-workflow") continue;
    if (resolved[configStep.workflowId]) continue;
    resolved[configStep.workflowId] = await loadWorkflowDefinition(
      configStep.workflowId,
      registry,
      { cwd },
    );
  }
  return resolved;
}
