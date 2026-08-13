/**
 * Pure OpenAPI → Spec inventory builder (no git / blob_facts).
 * Linking: schema ↔ routes/<resource>/ via normalized stems → object | both | routes.
 */
import { parse as parseYaml } from "yaml";
import type { ImportUsedBy } from "./import-resolution.ts";

export type SpecEntityPresence = "object" | "routes" | "both";

export type SpecInventoryUsedBy = ImportUsedBy;

export interface SpecInventoryOperation {
  operationId: string;
  method: string;
  path: string;
  summary: string | null;
  yamlPath: string;
  requestSchemas: string[];
  responseSchemas: string[];
  usedBy: SpecInventoryUsedBy[];
}

export interface SpecInventorySchema {
  name: string;
  yamlPath: string;
  description: string | null;
  properties: Array<{
    name: string;
    typeKind: string;
    docstring: string | null;
  }>;
  usedBy: SpecInventoryUsedBy[];
  referencedByOperations: string[];
}

export interface SpecInventoryEntity {
  key: string;
  label: string;
  presence: SpecEntityPresence;
  resource: string | null;
  schema: SpecInventorySchema | null;
  operations: SpecInventoryOperation[];
  usedByPackages: string[];
}

export interface PackageSpecInventory {
  entities: SpecInventoryEntity[];
}

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
]);

/** PascalCase / snake → kebab-case. */
export function toKebabStem(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/_/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** Light English plural → singular for stem matching. */
export function singularizeStem(kebab: string): string {
  if (kebab.endsWith("ies") && kebab.length > 3) {
    return `${kebab.slice(0, -3)}y`;
  }
  if (kebab.endsWith("sses")) {
    return kebab.slice(0, -2);
  }
  if (kebab.endsWith("s") && !kebab.endsWith("ss") && kebab.length > 1) {
    return kebab.slice(0, -1);
  }
  return kebab;
}

export function stemsMatch(a: string, b: string): boolean {
  return singularizeStem(toKebabStem(a)) === singularizeStem(toKebabStem(b));
}

function matchScore(schemaName: string, resource: string): number {
  const s = singularizeStem(toKebabStem(schemaName));
  const r = singularizeStem(toKebabStem(resource));
  if (s === r) return 2;
  return 0;
}

function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? text.trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function parseRef(ref: string): { file: string | null; fragment: string | null } {
  const hash = ref.indexOf("#");
  if (hash < 0) {
    return { file: ref || null, fragment: null };
  }
  const file = ref.slice(0, hash) || null;
  const fragment = ref.slice(hash + 1) || null;
  return { file, fragment };
}

function resolvePackageRelative(fromFile: string, rel: string): string {
  if (!rel || rel.startsWith("/")) return rel.replace(/^\//, "");
  const fromDir = fromFile.includes("/")
    ? fromFile.slice(0, fromFile.lastIndexOf("/"))
    : "";
  const joined = fromDir ? `${fromDir}/${rel}` : rel;
  const parts: string[] = [];
  for (const p of joined.split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") {
      parts.pop();
      continue;
    }
    parts.push(p);
  }
  return parts.join("/");
}

function componentNameFromFragment(fragment: string | null): string | null {
  if (!fragment) return null;
  const m = /(?:^|\/)components\/schemas\/([^/]+)$/.exec(fragment);
  return m?.[1] ?? null;
}

function propTypeKind(prop: unknown): string {
  if (!isRecord(prop)) return "unknown";
  if (typeof prop.$ref === "string") {
    const { fragment, file } = parseRef(prop.$ref);
    const fromFrag = componentNameFromFragment(fragment);
    if (fromFrag) return fromFrag;
    if (file) {
      const base = file.split("/").pop() ?? file;
      return base.replace(/\.yaml$/, "");
    }
    return "ref";
  }
  if (prop.type === "array") {
    return `array<${propTypeKind(prop.items)}>`;
  }
  if (typeof prop.type === "string") return prop.type;
  if (prop.allOf || prop.oneOf || prop.anyOf) return "union";
  return "object";
}

function extractProperties(
  doc: unknown,
): SpecInventorySchema["properties"] {
  if (!isRecord(doc) || !isRecord(doc.properties)) return [];
  const out: SpecInventorySchema["properties"] = [];
  for (const [name, prop] of Object.entries(doc.properties)) {
    const docstring =
      isRecord(prop) && typeof prop.description === "string"
        ? firstLine(prop.description)
        : null;
    out.push({ name, typeKind: propTypeKind(prop), docstring });
  }
  return out;
}

function collectSchemaNamesFromNode(
  node: unknown,
  resolveName: (ref: string, fromFile: string) => string | null,
  fromFile: string,
  out: Set<string>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectSchemaNamesFromNode(item, resolveName, fromFile, out);
    }
    return;
  }
  if (!isRecord(node)) return;
  if (typeof node.$ref === "string") {
    const name = resolveName(node.$ref, fromFile);
    if (name) out.add(name);
  }
  for (const v of Object.values(node)) {
    collectSchemaNamesFromNode(v, resolveName, fromFile, out);
  }
}

function extractOperationSchemas(
  op: Record<string, unknown>,
  resolveName: (ref: string, fromFile: string) => string | null,
  fromFile: string,
): { request: string[]; response: string[] } {
  const request = new Set<string>();
  const response = new Set<string>();
  if (op.requestBody != null) {
    collectSchemaNamesFromNode(op.requestBody, resolveName, fromFile, request);
  }
  if (isRecord(op.responses)) {
    for (const [code, body] of Object.entries(op.responses)) {
      if (!/^2\d\d$/.test(code) && code !== "default") continue;
      collectSchemaNamesFromNode(body, resolveName, fromFile, response);
    }
  }
  return {
    request: [...request].sort(),
    response: [...response].sort(),
  };
}

/**
 * Build inventory from package-relative YAML texts.
 * `files` keys are package-relative POSIX paths (e.g. `openapi.yaml`, `routes/matters/create.yaml`).
 */
export function buildSpecInventoryFromFiles(
  files: Map<string, string>,
  openapiPath: string = "openapi.yaml",
): PackageSpecInventory {
  const openapiText = files.get(openapiPath);
  if (openapiText == null) {
    return { entities: [] };
  }

  let openapiDoc: unknown;
  try {
    openapiDoc = parseYaml(openapiText);
  } catch {
    return { entities: [] };
  }
  if (!isRecord(openapiDoc)) return { entities: [] };

  const schemaByName = new Map<string, { yamlPath: string }>();
  const nameByYamlPath = new Map<string, string>();

  const components = isRecord(openapiDoc.components)
    ? openapiDoc.components
    : null;
  const schemaComponents = components && isRecord(components.schemas)
    ? components.schemas
    : {};

  for (const [name, entry] of Object.entries(schemaComponents)) {
    if (!isRecord(entry) || typeof entry.$ref !== "string") continue;
    const { file } = parseRef(entry.$ref);
    if (!file) continue;
    const yamlPath = resolvePackageRelative(openapiPath, file);
    // Business objects: schemas/ only (skip events/, responses/, …).
    if (!yamlPath.startsWith("schemas/")) continue;
    schemaByName.set(name, { yamlPath });
    nameByYamlPath.set(yamlPath, name);
  }

  const resolveSchemaName = (ref: string, fromFile: string): string | null => {
    const { file, fragment } = parseRef(ref);
    const fromFrag = componentNameFromFragment(fragment);
    if (fromFrag && schemaByName.has(fromFrag)) return fromFrag;
    if (fromFrag) return fromFrag;
    if (file) {
      const resolved = resolvePackageRelative(fromFile, file);
      return nameByYamlPath.get(resolved) ?? null;
    }
    return null;
  };

  const schemas: SpecInventorySchema[] = [];
  for (const [name, meta] of schemaByName) {
    const text = files.get(meta.yamlPath);
    let doc: unknown = null;
    if (text != null) {
      try {
        doc = parseYaml(text);
      } catch {
        doc = null;
      }
    }
    const description =
      isRecord(doc) && typeof doc.description === "string"
        ? firstLine(doc.description)
        : null;
    schemas.push({
      name,
      yamlPath: meta.yamlPath,
      description,
      properties: extractProperties(doc),
      usedBy: [],
      referencedByOperations: [],
    });
  }

  type RawOp = Omit<SpecInventoryOperation, "usedBy"> & { resource: string };
  const opsByResource = new Map<string, RawOp[]>();

  const paths = isRecord(openapiDoc.paths) ? openapiDoc.paths : {};
  for (const [apiPath, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) continue;
    for (const [method, opRef] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;
      if (!isRecord(opRef) || typeof opRef.$ref !== "string") continue;

      const { file, fragment } = parseRef(opRef.$ref);
      if (!file) continue;
      const yamlPath = resolvePackageRelative(openapiPath, file);
      const resourceMatch = /^routes\/([^/]+)\//.exec(yamlPath);
      if (!resourceMatch) continue;
      const resource = resourceMatch[1]!;

      const routeText = files.get(yamlPath);
      if (routeText == null) continue;
      let routeDoc: unknown;
      try {
        routeDoc = parseYaml(routeText);
      } catch {
        continue;
      }
      if (!isRecord(routeDoc)) continue;

      const fragKey = fragment?.replace(/^\//, "") ?? null;
      const opNode =
        (fragKey && isRecord(routeDoc[fragKey])
          ? routeDoc[fragKey]
          : null) ??
        (Object.values(routeDoc).find((v) => isRecord(v) && "operationId" in v) as
          | Record<string, unknown>
          | undefined) ??
        null;
      if (!opNode) continue;

      const operationId =
        typeof opNode.operationId === "string"
          ? opNode.operationId
          : fragKey ?? `${method}_${apiPath}`;
      const summary =
        typeof opNode.summary === "string" ? opNode.summary : null;
      const { request, response } = extractOperationSchemas(
        opNode,
        resolveSchemaName,
        yamlPath,
      );

      const raw: RawOp = {
        operationId,
        method: method.toLowerCase(),
        path: apiPath,
        summary,
        yamlPath,
        requestSchemas: request,
        responseSchemas: response,
        resource,
      };
      let list = opsByResource.get(resource);
      if (!list) {
        list = [];
        opsByResource.set(resource, list);
      }
      list.push(raw);
    }
  }

  for (const list of opsByResource.values()) {
    list.sort(
      (a, b) =>
        a.path.localeCompare(b.path) ||
        a.method.localeCompare(b.method) ||
        a.operationId.localeCompare(b.operationId),
    );
  }

  const resources = [...opsByResource.keys()].sort((a, b) =>
    a.localeCompare(b),
  );
  const unmatchedSchemas = [...schemas].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const entities: SpecInventoryEntity[] = [];

  for (const resource of resources) {
    let best: { schema: SpecInventorySchema; score: number; idx: number } | null =
      null;
    for (let i = 0; i < unmatchedSchemas.length; i++) {
      const schema = unmatchedSchemas[i]!;
      const score = matchScore(schema.name, resource);
      if (score === 0) continue;
      if (!best || score > best.score) {
        best = { schema, score, idx: i };
      }
    }

    const ops = (opsByResource.get(resource) ?? []).map((o) => ({
      operationId: o.operationId,
      method: o.method,
      path: o.path,
      summary: o.summary,
      yamlPath: o.yamlPath,
      requestSchemas: o.requestSchemas,
      responseSchemas: o.responseSchemas,
      usedBy: [] as SpecInventoryUsedBy[],
    }));

    if (best) {
      unmatchedSchemas.splice(best.idx, 1);
      entities.push({
        key: `both:${best.schema.name}`,
        label: best.schema.name,
        presence: "both",
        resource,
        schema: best.schema,
        operations: ops,
        usedByPackages: [],
      });
    } else {
      entities.push({
        key: `routes:${resource}`,
        label: resource,
        presence: "routes",
        resource,
        schema: null,
        operations: ops,
        usedByPackages: [],
      });
    }
  }

  for (const schema of unmatchedSchemas) {
    entities.push({
      key: `object:${schema.name}`,
      label: schema.name,
      presence: "object",
      resource: null,
      schema,
      operations: [],
      usedByPackages: [],
    });
  }

  // referencedByOperations across all ops
  const opsAll = entities.flatMap((e) => e.operations);
  const refsBySchema = new Map<string, Set<string>>();
  for (const op of opsAll) {
    for (const name of [...op.requestSchemas, ...op.responseSchemas]) {
      let set = refsBySchema.get(name);
      if (!set) {
        set = new Set();
        refsBySchema.set(name, set);
      }
      set.add(op.operationId);
    }
  }
  for (const e of entities) {
    if (!e.schema) continue;
    const set = refsBySchema.get(e.schema.name);
    e.schema.referencedByOperations = set
      ? [...set].sort((a, b) => a.localeCompare(b))
      : [];
  }

  entities.sort((a, b) => a.label.localeCompare(b.label));
  return { entities };
}
