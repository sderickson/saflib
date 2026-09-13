import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { WorkflowDefinition } from "@saflib/new-workflows";

/**
 * Same dual lookup as the old CLI's `loadWorkflowDefinition`: a bare id
 * looks up the in-memory registry; a `./`-prefixed or `.ts`-suffixed path
 * dynamic-imports a file's default export. The path form is what makes
 * dogfooding a new workflow possible without a registry-scaffolding tool.
 */
export async function loadWorkflowDefinition(
  idOrPath: string,
  registry: WorkflowDefinition<any, any>[],
): Promise<WorkflowDefinition<any, any>> {
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
