import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

/** `operationId:statusCode`, e.g. `getMatter:200`. */
export type RootResponseAllowKey = `${string}:${string}`;

export type RootResponseBodyViolation = {
  /** Path relative to the package root. */
  file: string;
  operationId: string;
  statusCode: string;
  reason: string;
  allowKey: RootResponseAllowKey;
};

export type AssertNoRootResponseBodiesOptions = {
  /**
   * Existing operations that still return a bare business object / array at the
   * JSON root. Format: `operationId:statusCode`. Unused entries fail so the
   * allowlist shrinks as routes are migrated.
   */
  allow?: readonly RootResponseAllowKey[];
};

type JsonSchema = {
  $ref?: string;
  type?: string;
  properties?: Record<string, unknown>;
  allOf?: JsonSchema[];
  items?: unknown;
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

function reasonIfRootViolation(schema: JsonSchema | undefined): string | null {
  if (!schema || typeof schema !== "object") {
    return "missing schema";
  }
  if (schema.$ref) {
    return `bare $ref (${schema.$ref}) — wrap as { resourceName: { $ref } }`;
  }
  if (schema.type === "array") {
    return "root array — wrap as { resourceNames: [...] }";
  }
  if (schema.type && schema.type !== "object") {
    return `root type ${schema.type} — JSON success bodies must be objects`;
  }
  if (
    Array.isArray(schema.allOf) &&
    schema.allOf.length === 1 &&
    schema.allOf[0]?.$ref &&
    !schema.properties
  ) {
    return `allOf single $ref (${schema.allOf[0].$ref}) — wrap as { resourceName: { $ref } }`;
  }
  // `type: object` with empty properties is OK (extensible empty success).
  if (schema.type === "object" || schema.properties) {
    return null;
  }
  return "unrecognized success schema — expected type: object with properties";
}

function* eachOperation(
  doc: Record<string, unknown>,
): Generator<{ operationId: string; responses: Record<string, unknown> }> {
  for (const [key, value] of Object.entries(doc)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const node = value as Record<string, unknown>;

    // Per-operation route files: top-level key is often the operationId.
    if (node.responses && typeof node.responses === "object") {
      const operationId =
        typeof node.operationId === "string" ? node.operationId : key;
      yield {
        operationId,
        responses: node.responses as Record<string, unknown>,
      };
      continue;
    }

    // Path-item style (method keys at top level of the file).
    if (HTTP_METHODS.has(key) && node.responses) {
      const operationId =
        typeof node.operationId === "string" ? node.operationId : key;
      yield {
        operationId,
        responses: node.responses as Record<string, unknown>,
      };
    }
  }
}

function jsonSuccessSchema(
  response: unknown,
): JsonSchema | undefined | "skip" {
  if (!response || typeof response !== "object") {
    return "skip";
  }
  const resp = response as Record<string, unknown>;
  // Shared response $ref (e.g. PaymentRequired) — not inlined here.
  if (typeof resp.$ref === "string") {
    return "skip";
  }
  const content = resp.content;
  if (!content || typeof content !== "object") {
    return "skip";
  }
  const json = (content as Record<string, unknown>)["application/json"];
  if (!json || typeof json !== "object") {
    return "skip";
  }
  return (json as { schema?: JsonSchema }).schema;
}

/**
 * Find 2xx `application/json` response schemas that put a business object,
 * array, or bare `$ref` at the document root instead of a flat keyed envelope
 * (`{ recipe: Recipe }`, `{ recipes: Recipe[] }`).
 */
export function findRootResponseBodyViolations(
  packageRoot: string,
): RootResponseBodyViolation[] {
  const root = path.resolve(packageRoot);
  const violations: RootResponseBodyViolation[] = [];

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
    for (const { operationId, responses } of eachOperation(
      doc as Record<string, unknown>,
    )) {
      for (const [statusCode, response] of Object.entries(responses)) {
        if (!/^[23]\d\d$/.test(statusCode)) {
          continue;
        }
        const schema = jsonSuccessSchema(response);
        if (schema === "skip") {
          continue;
        }
        const reason = reasonIfRootViolation(schema);
        if (!reason) {
          continue;
        }
        violations.push({
          file: rel,
          operationId,
          statusCode,
          reason,
          allowKey: `${operationId}:${statusCode}`,
        });
      }
    }
  }

  return violations;
}

/**
 * Throw if any success JSON response puts a resource at the document root.
 * Pass current offenders in `allow` and remove entries as routes are migrated.
 */
export function assertNoRootResponseBodies(
  packageRoot: string = process.cwd(),
  options: AssertNoRootResponseBodiesOptions = {},
): void {
  const allow = new Set(options.allow ?? []);
  const violations = findRootResponseBodyViolations(packageRoot);
  const unexpected = violations.filter((v) => !allow.has(v.allowKey));
  const used = new Set(violations.map((v) => v.allowKey));
  const unusedAllow = [...allow].filter((key) => !used.has(key));

  const parts: string[] = [];
  if (unexpected.length > 0) {
    parts.push(
      `JSON success responses must be flat objects keyed by resource name (not a bare business object, array, or $ref at the root). See @saflib/openapi docs/02-api-design.md.\n` +
        unexpected
          .map(
            (v) =>
              `  ${v.allowKey} (${v.file}): ${v.reason}`,
          )
          .join("\n") +
        `\nAdd to allow only for legacy routes being migrated; new routes must not be allowlisted.`,
    );
  }
  if (unusedAllow.length > 0) {
    parts.push(
      `Unused root-response allowlist entries (route already fixed — remove from allow):\n` +
        unusedAllow.map((k) => `  ${k}`).join("\n"),
    );
  }
  if (parts.length > 0) {
    throw new Error(parts.join("\n\n"));
  }
}
