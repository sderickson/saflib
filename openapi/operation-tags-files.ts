/**
 * File-system scanners for OpenAPI route YAML tag enforcement.
 * Node-only — do not import from browser-reachable barrels.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  OPENAPI_ENFORCED_TAG_SET,
  OPENAPI_ENFORCED_TAGS,
  findOperationAccessProblem,
  type OpenApiTagViolation,
} from "./operation-tags.ts";

export type OpenApiAccessViolation = {
  operationId: string;
  path: string;
  problem: string;
};

function collectRouteYamlFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.includes("__")) {
      continue;
    }
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectRouteYamlFiles(full));
      continue;
    }
    if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
      out.push(full);
    }
  }
  return out;
}

const HTTP_METHOD_KEYS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

/**
 * Scan routes YAML under a spec package for unknown operation tags.
 * Prefer this in package tests; use {@link assertOpenApiOperationTags} on the
 * bundled document at process startup.
 */
function forEachRouteFileOperation(
  packageRoot: string,
  visit: (operationId: string, op: Record<string, unknown>, rel: string) => void,
): void {
  const root = path.resolve(packageRoot);

  for (const file of collectRouteYamlFiles(path.join(root, "routes"))) {
    let doc: unknown;
    try {
      doc = parseYaml(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      continue;
    }
    const rel = path.relative(root, file);

    for (const [key, value] of Object.entries(
      doc as Record<string, unknown>,
    )) {
      if (!value || typeof value !== "object") {
        continue;
      }
      const node = value as Record<string, unknown>;

      const checkOp = (operationId: string, op: Record<string, unknown>) =>
        visit(operationId, op, rel);

      if (Array.isArray(node.tags) || node.responses) {
        const operationId =
          typeof node.operationId === "string" ? node.operationId : key;
        checkOp(operationId, node);
        continue;
      }

      if (HTTP_METHOD_KEYS.has(key) && node.responses) {
        const operationId =
          typeof node.operationId === "string" ? node.operationId : key;
        checkOp(operationId, node);
      }
    }
  }
}

export function findUnknownOpenApiRouteFileTags(
  packageRoot: string,
): OpenApiTagViolation[] {
  const violations: OpenApiTagViolation[] = [];
  forEachRouteFileOperation(packageRoot, (operationId, op, rel) => {
    for (const tag of (op.tags as string[] | undefined) ?? []) {
      if (!OPENAPI_ENFORCED_TAG_SET.has(tag)) {
        violations.push({ operationId, tag, path: rel });
      }
    }
  });
  return violations;
}

/**
 * Scan routes YAML under a spec package for operations whose access is not
 * declared with OpenAPI `security` or `x-public: true`.
 */
export function findOpenApiRouteFileAccessViolations(
  packageRoot: string,
): OpenApiAccessViolation[] {
  const violations: OpenApiAccessViolation[] = [];
  forEachRouteFileOperation(packageRoot, (operationId, op, rel) => {
    const problem = findOperationAccessProblem(op);
    if (problem) {
      violations.push({ operationId, path: rel, problem });
    }
  });
  return violations;
}

/**
 * Throw if any route YAML operation uses a tag outside the enforced allowlist
 * or does not declare its access (`security` / `x-public`).
 */
export function assertOpenApiRouteFileTags(
  packageRoot: string = process.cwd(),
): void {
  const access = findOpenApiRouteFileAccessViolations(packageRoot);
  if (access.length > 0) {
    throw new Error(
      `OpenAPI operations must declare access:\n${access
        .map((v) => `  ${v.operationId} (${v.path}): ${v.problem}`)
        .join("\n")}`,
    );
  }
  const violations = findUnknownOpenApiRouteFileTags(packageRoot);
  if (violations.length === 0) {
    return;
  }
  const allowed = OPENAPI_ENFORCED_TAGS.join(", ");
  const details = violations
    .map((v) => `  ${v.operationId} (${v.path}): unknown tag "${v.tag}"`)
    .join("\n");
  throw new Error(
    `OpenAPI operation tags must be from the enforced allowlist (${allowed}). Grouping tags are not allowed — use the owning package instead.\n${details}`,
  );
}
