export interface OpenApiDoc {
  openapi: string;
  info?: { title?: string; version?: string };
  /** Document-wide default; folded into each operation when sliced. */
  security?: Array<Record<string, string[]>>;
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    responses?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
    requestBodies?: Record<string, unknown>;
  };
}

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
] as const;

export interface OperationEntry {
  operationId: string;
  pathKey: string;
  method: string;
}

export function collectOperationsFromBundled(
  bundled: OpenApiDoc,
): OperationEntry[] {
  const entries: OperationEntry[] = [];

  for (const [pathKey, pathItem] of Object.entries(bundled.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as { operationId?: string } | undefined;
      if (!op?.operationId) continue;
      entries.push({
        operationId: op.operationId,
        pathKey,
        method,
      });
    }
  }

  return entries.sort((a, b) => a.operationId.localeCompare(b.operationId));
}

function collectInternalRefs(obj: unknown, refs: Set<string>): void {
  if (obj === null || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectInternalRefs(item, refs);
    return;
  }
  const record = obj as Record<string, unknown>;
  if (typeof record.$ref === "string" && record.$ref.startsWith("#/")) {
    refs.add(record.$ref);
  }
  for (const value of Object.values(record)) {
    collectInternalRefs(value, refs);
  }
}

function resolveTransitiveRefs(
  bundled: OpenApiDoc,
  refs: Set<string>,
  collected: Set<string>,
): void {
  for (const ref of refs) {
    if (collected.has(ref)) continue;
    collected.add(ref);

    const target = resolveRefTarget(bundled, ref);
    if (!target) continue;

    const nested = new Set<string>();
    collectInternalRefs(target, nested);
    resolveTransitiveRefs(bundled, nested, collected);
  }
}

function resolveRefTarget(bundled: OpenApiDoc, ref: string): unknown {
  const parts = ref.slice(2).split("/");
  let target: unknown = bundled;
  for (const part of parts) {
    if (!target || typeof target !== "object") return undefined;
    target = (target as Record<string, unknown>)[part];
  }
  return target;
}

function buildComponentSubset(
  bundled: OpenApiDoc,
  refs: Set<string>,
): OpenApiDoc["components"] {
  const components: OpenApiDoc["components"] = {};

  for (const ref of refs) {
    const match = ref.match(/^#\/components\/([^/]+)\/(.+)$/);
    if (!match) continue;

    const [, section, name] = match;
    const sectionKey = section as keyof NonNullable<OpenApiDoc["components"]>;
    const sourceSection = bundled.components?.[sectionKey];
    if (!sourceSection || typeof sourceSection !== "object") continue;

    const source = sourceSection as Record<string, unknown>;
    if (source[name] === undefined) continue;

    if (!components[sectionKey]) {
      components[sectionKey] = {};
    }
    (components[sectionKey] as Record<string, unknown>)[name] = source[name];
  }

  return components;
}

export function sliceOperation(
  bundled: OpenApiDoc,
  pathKey: string,
  method: string,
  operationId: string,
): OpenApiDoc {
  const pathItem = bundled.paths?.[pathKey];
  const operation = pathItem?.[method];
  if (!pathItem || !operation) {
    throw new Error(
      `Missing bundled operation ${method.toUpperCase()} ${pathKey} (${operationId})`,
    );
  }

  // Security requirements name schemes directly (no $ref), and a top-level
  // default would be lost in the fragment, so fold both in explicitly.
  // `x-public` operations never inherit the default.
  const op = operation as {
    security?: OpenApiDoc["security"];
    "x-public"?: unknown;
  };
  const security =
    op.security ?? (op["x-public"] === true ? undefined : bundled.security);
  const slicedOperation =
    security === undefined ? operation : { ...operation, security };

  const refs = new Set<string>();
  collectInternalRefs(operation, refs);
  for (const requirement of security ?? []) {
    for (const scheme of Object.keys(requirement)) {
      refs.add(`#/components/securitySchemes/${scheme}`);
    }
  }
  const collected = new Set<string>();
  resolveTransitiveRefs(bundled, refs, collected);

  return {
    openapi: bundled.openapi,
    info: {
      title: operationId,
      version: bundled.info?.version ?? "1.0.0",
    },
    paths: {
      [pathKey]: {
        [method]: slicedOperation,
      },
    },
    components: buildComponentSubset(bundled, collected),
  };
}

const SLICE_SOURCE = Symbol.for("@saflib/openapi/slice-source");
/** Per source document: its private copy, or null when it can't be shared. */
const validationCopies = new WeakMap<object, object | null>();

/**
 * Whether the document still has a `$ref` to another file. A validator given
 * the whole document resolves every one of them, so a single dangling ref
 * (like a template's placeholder route) would fail every route; a slice only
 * carries the refs its own operation uses.
 */
function hasExternalRef(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(hasExternalRef);
  if (node === null || typeof node !== "object") return false;
  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string" && !value.startsWith("#")) {
      return true;
    }
    if (hasExternalRef(value)) return true;
  }
  return false;
}

/**
 * The complete document a {@link sliceOperationById} slice was cut from, as
 * one private copy per document (so validators may annotate it without
 * touching the original). Lets every route cut from one document share a
 * single request validator: building a validator is expensive, so one per
 * route made startup slow. Undefined for documents that aren't slices, and
 * for documents with refs to other files (see {@link hasExternalRef}): those
 * validate per slice as before.
 */
export function fullDocumentForValidation<T extends object>(
  slice: T,
): T | undefined {
  const source = (slice as Record<symbol, object | undefined>)[SLICE_SOURCE];
  if (!source) return undefined;
  let copy = validationCopies.get(source);
  if (copy === undefined) {
    copy = hasExternalRef(source) ? null : structuredClone(source);
    validationCopies.set(source, copy);
  }
  return (copy ?? undefined) as T | undefined;
}

/**
 * {@link sliceOperation} by operation id: the one-operation document a route
 * validates against, cut from the package's complete OpenAPI document. The
 * result is a deep copy: validators may annotate the document they are given,
 * and slices of one document must not share objects. It remembers the
 * document it came from (see {@link fullDocumentForValidation}).
 */
export function sliceOperationById<T extends object>(
  document: T,
  operationId: string,
): T {
  const doc = document as unknown as OpenApiDoc;
  const entry = collectOperationsFromBundled(doc).find(
    (e) => e.operationId === operationId,
  );
  if (!entry) {
    throw new Error(`Unknown operationId ${operationId}`);
  }
  const slice = structuredClone(
    sliceOperation(doc, entry.pathKey, entry.method, operationId),
  );
  Object.defineProperty(slice, SLICE_SOURCE, { value: document });
  return slice as unknown as T;
}
