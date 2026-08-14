/**
 * Pure OpenAPI → Spec inventory builder (no git / blob_facts).
 * Linking: schema ↔ routes/<resource>/ via normalized stems → object | both | routes.
 */
import { parse as parseYaml } from "yaml";
import type { ImportUsedBy } from "./import-resolution.ts";

export type SpecEntityPresence = "object" | "routes" | "both";

export type SpecInventoryUsedBy = ImportUsedBy;

export interface SpecInventoryFileRef {
  /** Path within the owning package (no package-root prefix). */
  filePath: string;
  /** Repo-relative path for source links. */
  repoPath: string;
}

/** One extracted describe/it/test specification for a handler. */
export interface SpecInventoryTestSpec {
  /** Nested titles joined with `" > "` (from blob facts / `@saflib/parser`). */
  fullName: string;
}

export interface SpecInventoryOperation {
  operationId: string;
  method: string;
  path: string;
  summary: string | null;
  /** OpenAPI `tags` on the operation. */
  tags: string[];
  /** Package-relative route YAML (under the `-spec` package). */
  yamlPath: string;
  /**
   * Isomorphic stem after `routes/` / `handlers/` / `requests/`
   * (e.g. `matters/core/create`).
   */
  routeStem: string | null;
  /** HTTP handler implementation, when a sibling `-http` package matches. */
  handler: SpecInventoryFileRef | null;
  /** SDK request module, when a sibling `-sdk` package matches. */
  request: SpecInventoryFileRef | null;
  /** SDK MSW/fake handler module (`*.fake.ts`) when present beside the request. */
  fake: SpecInventoryFileRef | null;
  /** describe/it specifications from colocated handler test files. */
  handlerTests: SpecInventoryTestSpec[];
  /**
   * Business objects in the request body — named schemas, expanding one layer
   * into object/array properties when the body is a bag of BOs.
   */
  requestSchemas: string[];
  /** Same as requestSchemas for 2xx responses. */
  responseSchemas: string[];
  /** Non-test product files importing the SDK request module for this route. */
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
  /** Repo-relative directory of the `-spec` package this inventory was built from. */
  packageDirectory?: string;
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

/**
 * Direct $ref / array-items $ref schema names on an object node's properties
 * (one property level only — does not recurse into nested objects).
 */
function directPropertySchemaNames(
  doc: unknown,
  resolveName: (ref: string, fromFile: string) => string | null,
  fromFile: string,
): string[] {
  if (!isRecord(doc) || !isRecord(doc.properties)) return [];
  const out = new Set<string>();
  for (const prop of Object.values(doc.properties)) {
    if (!isRecord(prop)) continue;
    if (typeof prop.$ref === "string") {
      const name = resolveName(prop.$ref, fromFile);
      if (name) out.add(name);
      continue;
    }
    if (prop.type === "array" && isRecord(prop.items)) {
      if (typeof prop.items.$ref === "string") {
        const name = resolveName(prop.items.$ref, fromFile);
        if (name) out.add(name);
      }
    }
  }
  return [...out];
}

function schemaNodeFromContent(
  mediaParent: unknown,
): { node: unknown; fromHint: string | null } | null {
  if (!isRecord(mediaParent)) return null;
  const content = mediaParent.content;
  if (!isRecord(content)) return null;
  for (const media of Object.values(content)) {
    if (!isRecord(media) || media.schema == null) continue;
    return { node: media.schema, fromHint: null };
  }
  return null;
}

/**
 * Business objects for a request/response schema node.
 * - Inline (or resolved) object whose properties are BO refs / arrays of BOs →
 *   those nested names (one layer).
 * - Otherwise a lone named schema $ref → that name.
 */
function businessObjectsFromSchemaNode(
  node: unknown,
  resolveName: (ref: string, fromFile: string) => string | null,
  fromFile: string,
  schemaDocByName: Map<string, { yamlPath: string; doc: unknown }>,
): string[] {
  if (node == null) return [];

  if (typeof node === "object" && !Array.isArray(node) && isRecord(node)) {
    if (typeof node.$ref === "string") {
      const name = resolveName(node.$ref, fromFile);
      if (!name) return [];
      const meta = schemaDocByName.get(name);
      if (meta) {
        const nested = directPropertySchemaNames(
          meta.doc,
          resolveName,
          meta.yamlPath,
        );
        if (nested.length > 0) return nested;
      }
      return [name];
    }
    if (node.type === "array" && node.items != null) {
      return businessObjectsFromSchemaNode(
        node.items,
        resolveName,
        fromFile,
        schemaDocByName,
      );
    }
    const nested = directPropertySchemaNames(node, resolveName, fromFile);
    if (nested.length > 0) return nested;
  }
  return [];
}

function extractOperationSchemas(
  op: Record<string, unknown>,
  resolveName: (ref: string, fromFile: string) => string | null,
  fromFile: string,
  schemaDocByName: Map<string, { yamlPath: string; doc: unknown }>,
): { request: string[]; response: string[] } {
  const request = new Set<string>();
  const response = new Set<string>();

  if (op.requestBody != null) {
    const media = schemaNodeFromContent(op.requestBody);
    if (media) {
      for (const n of businessObjectsFromSchemaNode(
        media.node,
        resolveName,
        fromFile,
        schemaDocByName,
      )) {
        request.add(n);
      }
    }
  }
  if (isRecord(op.responses)) {
    for (const [code, body] of Object.entries(op.responses)) {
      if (!/^2\d\d$/.test(code) && code !== "default") continue;
      const media = schemaNodeFromContent(body);
      if (!media) continue;
      for (const n of businessObjectsFromSchemaNode(
        media.node,
        resolveName,
        fromFile,
        schemaDocByName,
      )) {
        response.add(n);
      }
    }
  }
  return {
    request: [...request].sort(),
    response: [...response].sort(),
  };
}

/** `routes/matters/core/create.yaml` → `matters/core/create`. */
export function routeStemFromYamlPath(yamlPath: string): string | null {
  const m = /^routes\/(.+)\.ya?ml$/i.exec(yamlPath.replace(/\\/g, "/"));
  return m?.[1] ?? null;
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
  const schemaDocByName = new Map<string, { yamlPath: string; doc: unknown }>();
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
    schemaDocByName.set(name, { yamlPath: meta.yamlPath, doc });
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

  type RawOp = Omit<
    SpecInventoryOperation,
    "usedBy" | "handler" | "request" | "fake" | "handlerTests"
  > & { resource: string };
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
      const tags = Array.isArray(opNode.tags)
        ? opNode.tags.filter((t): t is string => typeof t === "string")
        : [];
      const { request, response } = extractOperationSchemas(
        opNode,
        resolveSchemaName,
        yamlPath,
        schemaDocByName,
      );

      const raw: RawOp = {
        operationId,
        method: method.toLowerCase(),
        path: apiPath,
        summary,
        tags,
        yamlPath,
        routeStem: routeStemFromYamlPath(yamlPath),
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
      tags: o.tags,
      yamlPath: o.yamlPath,
      routeStem: o.routeStem,
      handler: null as SpecInventoryOperation["handler"],
      request: null as SpecInventoryOperation["request"],
      fake: null as SpecInventoryOperation["fake"],
      handlerTests: [] as SpecInventoryTestSpec[],
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
