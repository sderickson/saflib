import type { PackageDirNode } from "./package-dir-tree.ts";
import {
  packageHasVueFiles,
  packageLocalPath,
  toModuleStem,
  toVueBundleStem,
  type ExportLike,
  type TestCaseLike,
  type TestFileNavNode,
  type TestTreeNode,
} from "./test-tree.ts";

export type ChangeKind = "added" | "removed" | "modified";

export function changeColor(kind: ChangeKind): "success" | "error" | "warning" {
  if (kind === "added") return "success";
  if (kind === "removed") return "error";
  return "warning";
}

export interface OverlaySpecProperty {
  name: string;
  typeKind: string;
  docstring?: string | null;
}

export interface OverlaySpecOperation {
  operationId: string;
  method: string;
  path: string;
}

export interface OverlaySpecEntity {
  key: string;
  presence?: string;
  schema?: {
    description?: string | null;
    properties: OverlaySpecProperty[];
  } | null;
  operations: OverlaySpecOperation[];
}

export interface OverlayDbColumn {
  sqlName: string;
  typeKind: string;
  propName?: string;
  docstring?: string | null;
}

export interface OverlayDbEntity {
  entity: string;
  table?: {
    tableName?: string;
    docstring?: string | null;
    columns: OverlayDbColumn[];
  } | null;
}

export interface OverlayPackageDetail {
  packageName: string;
  directory?: string;
  exports?: ExportLike[];
  testCases?: TestCaseLike[];
  specInventory?: {
    packageDirectory?: string;
    entities: OverlaySpecEntity[];
  } | null;
  dbInventory?: { entities: OverlayDbEntity[] } | null;
}

export interface PackageChangeOverlay {
  packageChange?: ChangeKind;
  modules: Record<string, ChangeKind>;
  exports: Record<string, ChangeKind>;
  tests: Record<string, ChangeKind>;
  specEntities: Record<string, ChangeKind>;
  specOperations: Record<string, ChangeKind>;
  specProperties: Record<string, ChangeKind>;
  dbEntities: Record<string, ChangeKind>;
  dbColumns: Record<string, ChangeKind>;
}

export interface CommitDiffLike {
  packageMetrics: {
    added: Array<{ packageName: string }>;
    removed: Array<{ packageName: string }>;
    changed: Array<{ after: { packageName: string } }>;
  };
  exports: {
    added: Array<{ packageName: string }>;
    removed: Array<{ packageName: string }>;
  };
  testCases: {
    added: Array<{ packageName: string }>;
    removed: Array<{ packageName: string }>;
  };
  dbSchemas: {
    tables: {
      added: Array<{ packageName: string }>;
      removed: Array<{ packageName: string }>;
    };
    columns: {
      added: Array<{ packageName: string }>;
      removed: Array<{ packageName: string }>;
      changed: Array<{ after: { packageName: string } }>;
    };
  };
}

export function emptyOverlay(): PackageChangeOverlay {
  return {
    modules: {},
    exports: {},
    tests: {},
    specEntities: {},
    specOperations: {},
    specProperties: {},
    dbEntities: {},
    dbColumns: {},
  };
}

export function exportIdentityKey(e: {
  filePath: string;
  name: string;
  kind: string;
}): string {
  return `${e.filePath}\0${e.name}\0${e.kind}`;
}

export function testIdentityKey(t: {
  filePath: string;
  fullName: string;
}): string {
  return `${t.filePath}\0${t.fullName}`;
}

export function specOperationKey(op: OverlaySpecOperation): string {
  return `${op.operationId}\0${op.method}\0${op.path}`;
}

export function specPropertyKey(entityKey: string, propName: string): string {
  return `${entityKey}\0${propName}`;
}

export function dbColumnKey(entity: string, sqlName: string): string {
  return `${entity}\0${sqlName}`;
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

function identityDiff<T>(
  before: T[],
  after: T[],
  keyOf: (item: T) => string,
  isModified?: (before: T, after: T) => boolean,
): Record<string, ChangeKind> {
  const out: Record<string, ChangeKind> = {};
  const beforeMap = new Map(before.map((item) => [keyOf(item), item]));
  const afterMap = new Map(after.map((item) => [keyOf(item), item]));
  for (const [key, afterItem] of afterMap) {
    const beforeItem = beforeMap.get(key);
    if (!beforeItem) out[key] = "added";
    else if (isModified?.(beforeItem, afterItem)) out[key] = "modified";
  }
  for (const key of beforeMap.keys()) {
    if (!afterMap.has(key)) out[key] = "removed";
  }
  return out;
}

function rollupChange(
  current: ChangeKind | undefined,
  next: ChangeKind,
): ChangeKind {
  if (!current) return next;
  if (current === next) return current;
  return "modified";
}

/** Child add/remove on a parent that already exists is a modification. */
function rollupChildIntoParent(
  parent: ChangeKind | undefined,
  child: ChangeKind,
): ChangeKind {
  if (parent === "added" || parent === "removed") {
    return rollupChange(parent, child);
  }
  return "modified";
}

function isEmptyDetail(detail: OverlayPackageDetail | null | undefined): boolean {
  if (!detail) return true;
  return (
    !(detail.exports ?? []).length &&
    !(detail.testCases ?? []).length &&
    !(detail.specInventory?.entities ?? []).length &&
    !(detail.dbInventory?.entities ?? []).length
  );
}

export function lookupExportChange(
  overlay: PackageChangeOverlay,
  filePath: string | null | undefined,
  name: string | null | undefined,
): ChangeKind | undefined {
  if (!filePath || !name) return undefined;
  const prefix = `${filePath}\0${name}\0`;
  const hits: ChangeKind[] = [];
  for (const [key, kind] of Object.entries(overlay.exports)) {
    if (key.startsWith(prefix)) hits.push(kind);
  }
  if (!hits.length) return undefined;
  return hits.reduce((acc, kind) => rollupChange(acc, kind));
}

export function packageChangesFromDiff(
  diff: CommitDiffLike,
): Record<string, ChangeKind> {
  const out: Record<string, ChangeKind> = {};
  for (const pkg of diff.packageMetrics.added) {
    out[pkg.packageName] = "added";
  }
  for (const pkg of diff.packageMetrics.removed) {
    out[pkg.packageName] = "removed";
  }
  const bumpModified = (packageName: string) => {
    if (!out[packageName]) out[packageName] = "modified";
  };
  for (const chg of diff.packageMetrics.changed) {
    bumpModified(chg.after.packageName);
  }
  for (const item of [
    ...diff.exports.added,
    ...diff.exports.removed,
    ...diff.testCases.added,
    ...diff.testCases.removed,
    ...diff.dbSchemas.tables.added,
    ...diff.dbSchemas.tables.removed,
    ...diff.dbSchemas.columns.added,
    ...diff.dbSchemas.columns.removed,
    ...diff.dbSchemas.columns.changed.map((c) => c.after),
  ]) {
    bumpModified(item.packageName);
  }
  return out;
}

export function diffPackageDetails(
  before: OverlayPackageDetail | null | undefined,
  after: OverlayPackageDetail | null | undefined,
  options: { productRoot?: string } = {},
): PackageChangeOverlay {
  const overlay = emptyOverlay();
  const emptyBefore = isEmptyDetail(before);
  const emptyAfter = isEmptyDetail(after);
  if (emptyBefore && emptyAfter) return overlay;

  const packageName =
    after?.packageName ?? before?.packageName ?? "";
  const directory = after?.directory ?? before?.directory ?? "";
  const productRoot = options.productRoot ?? "";
  const beforeExports = before?.exports ?? [];
  const afterExports = after?.exports ?? [];
  const beforeTests = before?.testCases ?? [];
  const afterTests = after?.testCases ?? [];

  overlay.exports = identityDiff(
    beforeExports,
    afterExports,
    exportIdentityKey,
    (b, a) =>
      !sameText(b.signature, a.signature) || !sameText(b.docstring, a.docstring),
  );
  overlay.tests = identityDiff(
    beforeTests,
    afterTests,
    testIdentityKey,
    (b, a) =>
      !sameText(b.subjectName, a.subjectName) ||
      !sameText(b.subjectSignature, a.subjectSignature) ||
      !sameText(b.subjectDocstring, a.subjectDocstring) ||
      !sameText(b.subjectFilePath, a.subjectFilePath) ||
      !sameText(b.subjectConfidence, a.subjectConfidence),
  );

  const vueBundles = packageHasVueFiles(
    [...beforeExports, ...afterExports],
    [...beforeTests, ...afterTests],
    packageName,
  );
  const stemOf = (filePath: string) => {
    const local = packageLocalPath(filePath, directory, productRoot);
    return vueBundles ? toVueBundleStem(local) : toModuleStem(local);
  };

  const stemKeys = new Map<string, Set<string>>();
  const addStemKey = (filePath: string, key: string, mapName: "exports" | "tests") => {
    const stem = stemOf(filePath);
    let set = stemKeys.get(stem);
    if (!set) {
      set = new Set();
      stemKeys.set(stem, set);
    }
    set.add(`${mapName}:${key}`);
  };
  for (const e of [...beforeExports, ...afterExports]) {
    addStemKey(e.filePath, exportIdentityKey(e), "exports");
  }
  for (const t of [...beforeTests, ...afterTests]) {
    addStemKey(t.filePath, testIdentityKey(t), "tests");
  }
  for (const [stem, keys] of stemKeys) {
    let change: ChangeKind | undefined;
    for (const token of keys) {
      const [mapName, ...rest] = token.split(":");
      const key = rest.join(":");
      const hit =
        mapName === "tests" ? overlay.tests[key] : overlay.exports[key];
      if (hit) change = rollupChange(change, hit);
    }
    if (change) overlay.modules[stem] = change;
  }

  const beforeSpec = before?.specInventory?.entities ?? [];
  const afterSpec = after?.specInventory?.entities ?? [];
  overlay.specOperations = identityDiff(
    beforeSpec.flatMap((e) => e.operations),
    afterSpec.flatMap((e) => e.operations),
    specOperationKey,
  );
  overlay.specProperties = identityDiff(
    beforeSpec.flatMap((e) =>
      (e.schema?.properties ?? []).map((p) => ({
        entityKey: e.key,
        ...p,
      })),
    ),
    afterSpec.flatMap((e) =>
      (e.schema?.properties ?? []).map((p) => ({
        entityKey: e.key,
        ...p,
      })),
    ),
    (p) => specPropertyKey(p.entityKey, p.name),
    (b, a) =>
      b.typeKind !== a.typeKind || !sameText(b.docstring, a.docstring),
  );
  overlay.specEntities = identityDiff(
    beforeSpec,
    afterSpec,
    (e) => e.key,
    (b, a) =>
      b.presence !== a.presence ||
      !sameText(b.schema?.description, a.schema?.description),
  );
  for (const [key, kind] of Object.entries(overlay.specProperties)) {
    const entityKey = key.split("\0")[0] ?? "";
    if (!entityKey) continue;
    overlay.specEntities[entityKey] = rollupChildIntoParent(
      overlay.specEntities[entityKey],
      kind,
    );
  }
  for (const e of [...beforeSpec, ...afterSpec]) {
    for (const op of e.operations) {
      const kind = overlay.specOperations[specOperationKey(op)];
      if (kind) {
        overlay.specEntities[e.key] = rollupChildIntoParent(
          overlay.specEntities[e.key],
          kind,
        );
      }
    }
  }

  const beforeDb = before?.dbInventory?.entities ?? [];
  const afterDb = after?.dbInventory?.entities ?? [];
  overlay.dbColumns = identityDiff(
    beforeDb.flatMap((e) =>
      (e.table?.columns ?? []).map((c) => ({ entity: e.entity, ...c })),
    ),
    afterDb.flatMap((e) =>
      (e.table?.columns ?? []).map((c) => ({ entity: e.entity, ...c })),
    ),
    (c) => dbColumnKey(c.entity, c.sqlName),
    (b, a) =>
      b.typeKind !== a.typeKind ||
      !sameText(b.propName, a.propName) ||
      !sameText(b.docstring, a.docstring),
  );
  overlay.dbEntities = identityDiff(
    beforeDb,
    afterDb,
    (e) => e.entity,
    (b, a) =>
      Boolean(b.table) !== Boolean(a.table) ||
      !sameText(b.table?.docstring, a.table?.docstring) ||
      !sameText(b.table?.tableName, a.table?.tableName),
  );
  for (const [key, kind] of Object.entries(overlay.dbColumns)) {
    const entity = key.split("\0")[0] ?? "";
    if (entity) {
      overlay.dbEntities[entity] = rollupChildIntoParent(
        overlay.dbEntities[entity],
        kind,
      );
    }
  }
  for (const [stem, kind] of Object.entries(overlay.modules)) {
    const queryMatch = /^queries\/([^/]+)/.exec(stem);
    const schemaMatch = /^schemas\/([^/]+)/.exec(stem);
    const entity = queryMatch?.[1] ?? schemaMatch?.[1];
    if (entity) {
      overlay.dbEntities[entity] = rollupChange(
        overlay.dbEntities[entity],
        kind,
      );
    }
  }
  for (const [entity, kind] of Object.entries(overlay.dbEntities)) {
    overlay.modules[`entities/${entity}`] = rollupChange(
      overlay.modules[`entities/${entity}`],
      kind,
    );
  }

  if (emptyBefore && !emptyAfter) overlay.packageChange = "added";
  else if (!emptyBefore && emptyAfter) overlay.packageChange = "removed";
  else if (overlayHasHits(overlay)) overlay.packageChange = "modified";

  return overlay;
}

export function overlayHasHits(overlay: PackageChangeOverlay): boolean {
  return (
    Object.keys(overlay.modules).length > 0 ||
    Object.keys(overlay.exports).length > 0 ||
    Object.keys(overlay.tests).length > 0 ||
    Object.keys(overlay.specEntities).length > 0 ||
    Object.keys(overlay.specOperations).length > 0 ||
    Object.keys(overlay.specProperties).length > 0 ||
    Object.keys(overlay.dbEntities).length > 0 ||
    Object.keys(overlay.dbColumns).length > 0
  );
}

export function unionByKey<T>(
  before: T[],
  after: T[],
  keyOf: (item: T) => string,
): T[] {
  const map = new Map<string, T>();
  for (const item of before) map.set(keyOf(item), item);
  for (const item of after) map.set(keyOf(item), item);
  return [...map.values()];
}

export function pickChangedItems<T>(
  before: T[],
  after: T[],
  keyOf: (item: T) => string,
  changes: Record<string, ChangeKind>,
): Array<T & { change: ChangeKind }> {
  const beforeMap = new Map(before.map((item) => [keyOf(item), item]));
  const afterMap = new Map(after.map((item) => [keyOf(item), item]));
  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const out: Array<T & { change: ChangeKind }> = [];
  for (const key of keys) {
    const change = changes[key];
    if (!change) continue;
    const item = change === "removed" ? beforeMap.get(key) : afterMap.get(key);
    if (!item) continue;
    out.push({ ...item, change });
  }
  return out;
}

export function filterPackageDirTree(
  nodes: PackageDirNode[],
  changeByPackage: Record<string, ChangeKind>,
): PackageDirNode[] {
  const out: PackageDirNode[] = [];
  for (const node of nodes) {
    if (node.kind === "package") {
      const change = node.packageName
        ? changeByPackage[node.packageName]
        : undefined;
      if (!change) continue;
      out.push({ ...node, change, children: [] });
      continue;
    }
    const children = filterPackageDirTree(node.children, changeByPackage);
    if (children.length) out.push({ ...node, children });
  }
  return out;
}

export function filterFileNav(
  nodes: TestFileNavNode[],
  changeByStem: Record<string, ChangeKind>,
): TestFileNavNode[] {
  const out: TestFileNavNode[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      const change = changeByStem[node.localPath];
      if (!change) continue;
      out.push({ ...node, change, children: [] });
      continue;
    }
    const children = filterFileNav(node.children, changeByStem);
    const self = changeByStem[node.localPath];
    if (!children.length && !self) continue;
    out.push({ ...node, change: self, children });
  }
  return out;
}

export function tagSpecTree(
  nodes: TestTreeNode[],
  overlay: PackageChangeOverlay,
  suiteParts: string[] = [],
): TestTreeNode[] {
  return nodes.map((node) => {
    if (node.kind === "test") {
      const fullName = [...suiteParts, node.label].join(" > ");
      const filePath = node.sourcePath ?? "";
      const change = filePath
        ? overlay.tests[testIdentityKey({ filePath, fullName })]
        : undefined;
      return { ...node, change };
    }
    if (node.kind === "suite") {
      const children = tagSpecTree(node.children, overlay, [
        ...suiteParts,
        node.label,
      ]);
      const exportChange = lookupExportChange(
        overlay,
        node.subjectFilePath,
        node.subjectName ?? node.label,
      );
      let change = exportChange;
      for (const child of children) {
        if (child.change) change = rollupChange(change, child.change);
      }
      return { ...node, change, children };
    }
    return { ...node, children: tagSpecTree(node.children, overlay, suiteParts) };
  });
}

export function pruneEmptySpecTree(nodes: TestTreeNode[]): TestTreeNode[] {
  const out: TestTreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "test" || node.kind === "suite") {
      if (node.kind === "suite") {
        const children = pruneEmptySpecTree(node.children);
        if (node.change || children.length) {
          out.push({ ...node, children });
        }
      } else if (node.change) {
        out.push(node);
      }
      continue;
    }
    const children = pruneEmptySpecTree(node.children);
    if (children.length) out.push({ ...node, children });
  }
  return out;
}
