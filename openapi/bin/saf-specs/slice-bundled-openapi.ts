export interface OpenApiDoc {
  openapi: string;
  info?: { title?: string; version?: string };
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

export function collectOperationsFromBundled(bundled: OpenApiDoc): OperationEntry[] {
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

  const refs = new Set<string>();
  collectInternalRefs(operation, refs);
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
        [method]: operation,
      },
    },
    components: buildComponentSubset(bundled, collected),
  };
}
