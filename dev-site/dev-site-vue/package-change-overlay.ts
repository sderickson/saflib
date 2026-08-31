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

export type ChangeKind = "added" | "removed" | "modified" | "moved";

export function changeColor(
  kind: ChangeKind,
): "success" | "error" | "warning" | "info" {
  if (kind === "added") return "success";
  if (kind === "removed") return "error";
  if (kind === "moved") return "info";
  return "warning";
}

export interface OverlaySpecProperty {
  name: string;
  type_kind: string;
  docstring?: string | null;
}

export interface OverlaySpecOperation {
  operation_id: string;
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
  sql_name: string;
  type_kind: string;
  prop_name?: string;
  docstring?: string | null;
}

export interface OverlayDbEntity {
  entity: string;
  table?: {
    table_name?: string;
    docstring?: string | null;
    columns: OverlayDbColumn[];
  } | null;
}

export interface OverlayPackageDetail {
  package_name: string;
  directory?: string;
  exports?: ExportLike[];
  test_cases?: TestCaseLike[];
  spec_inventory?: {
    package_directory?: string;
    entities: OverlaySpecEntity[];
  } | null;
  db_inventory?: { entities: OverlayDbEntity[] } | null;
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
  /** New module stem → old stem when git renamed the file(s). */
  movedFrom: Record<string, string>;
}

export interface PathRename {
  from_path: string;
  to_path: string;
}

export interface CommitDiffLike {
  package_metrics: {
    added: Array<{ package_name: string }>;
    removed: Array<{ package_name: string }>;
    changed: Array<{ after: { package_name: string } }>;
  };
  exports: {
    added: Array<{ package_name: string }>;
    removed: Array<{ package_name: string }>;
  };
  test_cases: {
    added: Array<{ package_name: string }>;
    removed: Array<{ package_name: string }>;
  };
  db_schemas: {
    tables: {
      added: Array<{ package_name: string }>;
      removed: Array<{ package_name: string }>;
    };
    columns: {
      added: Array<{ package_name: string }>;
      removed: Array<{ package_name: string }>;
      changed: Array<{ after: { package_name: string } }>;
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
    movedFrom: {},
  };
}

export function exportIdentityKey(e: {
  file_path: string;
  name: string;
  kind: string;
}): string {
  return `${e.file_path}\0${e.name}\0${e.kind}`;
}

export function testIdentityKey(t: {
  file_path: string;
  full_name: string;
}): string {
  return `${t.file_path}\0${t.full_name}`;
}

export function specOperationKey(op: OverlaySpecOperation): string {
  return `${op.operation_id}\0${op.method}\0${op.path}`;
}

export function specPropertyKey(entityKey: string, prop_name: string): string {
  return `${entityKey}\0${prop_name}`;
}

export function dbColumnKey(entity: string, sql_name: string): string {
  return `${entity}\0${sql_name}`;
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

function renameMap(renames: PathRename[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of renames) {
    if (r.from_path && r.to_path && r.from_path !== r.to_path) {
      map.set(r.from_path, r.to_path);
    }
  }
  return map;
}

function findOldPath(
  oldToNew: Map<string, string>,
  newPath: string,
): string | undefined {
  for (const [from, to] of oldToNew) {
    if (to === newPath) return from;
  }
  return undefined;
}

function collapsePathRenames<T extends { file_path: string }>(
  overlayMap: Record<string, ChangeKind>,
  before: T[],
  after: T[],
  keyOf: (item: T) => string,
  oldToNew: Map<string, string>,
  isModified?: (before: T, after: T) => boolean,
): void {
  if (!oldToNew.size) return;
  const afterByKey = new Map(after.map((item) => [keyOf(item), item]));
  for (const beforeItem of before) {
    const newPath = oldToNew.get(beforeItem.file_path);
    if (!newPath) continue;
    const oldKey = keyOf(beforeItem);
    const rewritten = { ...beforeItem, file_path: newPath };
    const newKey = keyOf(rewritten);
    const afterItem = afterByKey.get(newKey);
    if (!afterItem) continue;
    delete overlayMap[oldKey];
    overlayMap[newKey] = isModified?.(beforeItem, afterItem)
      ? "modified"
      : "moved";
  }
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
    !(detail.test_cases ?? []).length &&
    !(detail.spec_inventory?.entities ?? []).length &&
    !(detail.db_inventory?.entities ?? []).length
  );
}

export function lookupExportChange(
  overlay: PackageChangeOverlay,
  file_path: string | null | undefined,
  name: string | null | undefined,
): ChangeKind | undefined {
  if (!file_path || !name) return undefined;
  const prefix = `${file_path}\0${name}\0`;
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
  for (const pkg of diff.package_metrics.added) {
    out[pkg.package_name] = "added";
  }
  for (const pkg of diff.package_metrics.removed) {
    out[pkg.package_name] = "removed";
  }
  const bumpModified = (package_name: string) => {
    if (!out[package_name]) out[package_name] = "modified";
  };
  for (const chg of diff.package_metrics.changed) {
    bumpModified(chg.after.package_name);
  }
  for (const item of [
    ...diff.exports.added,
    ...diff.exports.removed,
    ...diff.test_cases.added,
    ...diff.test_cases.removed,
    ...diff.db_schemas.tables.added,
    ...diff.db_schemas.tables.removed,
    ...diff.db_schemas.columns.added,
    ...diff.db_schemas.columns.removed,
    ...diff.db_schemas.columns.changed.map((c) => c.after),
  ]) {
    bumpModified(item.package_name);
  }
  return out;
}

export function diffPackageDetails(
  before: OverlayPackageDetail | null | undefined,
  after: OverlayPackageDetail | null | undefined,
  options: { product_root?: string; pathRenames?: PathRename[] } = {},
): PackageChangeOverlay {
  const overlay = emptyOverlay();
  const emptyBefore = isEmptyDetail(before);
  const emptyAfter = isEmptyDetail(after);
  if (emptyBefore && emptyAfter) return overlay;

  const package_name =
    after?.package_name ?? before?.package_name ?? "";
  const directory = after?.directory ?? before?.directory ?? "";
  const product_root = options.product_root ?? "";
  const beforeExports = before?.exports ?? [];
  const afterExports = after?.exports ?? [];
  const beforeTests = before?.test_cases ?? [];
  const afterTests = after?.test_cases ?? [];
  const oldToNew = renameMap(options.pathRenames ?? []);

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
      !sameText(b.subject_name, a.subject_name) ||
      !sameText(b.subject_signature, a.subject_signature) ||
      !sameText(b.subject_docstring, a.subject_docstring) ||
      !sameText(b.subject_file_path, a.subject_file_path) ||
      !sameText(b.subject_confidence, a.subject_confidence),
  );
  collapsePathRenames(
    overlay.exports,
    beforeExports,
    afterExports,
    exportIdentityKey,
    oldToNew,
    (b, a) =>
      !sameText(b.signature, a.signature) || !sameText(b.docstring, a.docstring),
  );
  collapsePathRenames(
    overlay.tests,
    beforeTests,
    afterTests,
    testIdentityKey,
    oldToNew,
    (b, a) =>
      !sameText(b.subject_name, a.subject_name) ||
      !sameText(b.subject_signature, a.subject_signature) ||
      !sameText(b.subject_docstring, a.subject_docstring) ||
      !sameText(b.subject_file_path, a.subject_file_path) ||
      !sameText(b.subject_confidence, a.subject_confidence),
  );

  const vueBundles = packageHasVueFiles(
    [...beforeExports, ...afterExports],
    [...beforeTests, ...afterTests],
    package_name,
  );
  const stemOf = (file_path: string) => {
    const local = packageLocalPath(file_path, directory, product_root);
    return vueBundles ? toVueBundleStem(local) : toModuleStem(local);
  };

  const stemKeys = new Map<string, Set<string>>();
  const addStemKey = (file_path: string, key: string, mapName: "exports" | "tests") => {
    const stem = stemOf(file_path);
    let set = stemKeys.get(stem);
    if (!set) {
      set = new Set();
      stemKeys.set(stem, set);
    }
    set.add(`${mapName}:${key}`);
  };
  for (const e of [...beforeExports, ...afterExports]) {
    addStemKey(e.file_path, exportIdentityKey(e), "exports");
  }
  for (const t of [...beforeTests, ...afterTests]) {
    addStemKey(t.file_path, testIdentityKey(t), "tests");
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
  for (const [newKey, kind] of Object.entries(overlay.exports)) {
    if (kind !== "moved" && kind !== "modified") continue;
    const parts = newKey.split("\0");
    const newPath = parts[0] ?? "";
    const oldPath = findOldPath(oldToNew, newPath);
    if (!oldPath) continue;
    const newStem = stemOf(newPath);
    const oldStem = stemOf(oldPath);
    if (newStem !== oldStem && overlay.modules[newStem] === "moved") {
      overlay.movedFrom[newStem] = oldStem;
    }
  }

  const beforeSpec = before?.spec_inventory?.entities ?? [];
  const afterSpec = after?.spec_inventory?.entities ?? [];
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
      b.type_kind !== a.type_kind || !sameText(b.docstring, a.docstring),
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

  const beforeDb = before?.db_inventory?.entities ?? [];
  const afterDb = after?.db_inventory?.entities ?? [];
  overlay.dbColumns = identityDiff(
    beforeDb.flatMap((e) =>
      (e.table?.columns ?? []).map((c) => ({ entity: e.entity, ...c })),
    ),
    afterDb.flatMap((e) =>
      (e.table?.columns ?? []).map((c) => ({ entity: e.entity, ...c })),
    ),
    (c) => dbColumnKey(c.entity, c.sql_name),
    (b, a) =>
      b.type_kind !== a.type_kind ||
      !sameText(b.prop_name, a.prop_name) ||
      !sameText(b.docstring, a.docstring),
  );
  overlay.dbEntities = identityDiff(
    beforeDb,
    afterDb,
    (e) => e.entity,
    (b, a) =>
      Boolean(b.table) !== Boolean(a.table) ||
      !sameText(b.table?.docstring, a.table?.docstring) ||
      !sameText(b.table?.table_name, a.table?.table_name),
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
      const change = node.package_name
        ? changeByPackage[node.package_name]
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
  movedFrom: Record<string, string> = {},
): TestFileNavNode[] {
  const out: TestFileNavNode[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      const change = changeByStem[node.localPath];
      if (!change) continue;
      out.push({
        ...node,
        change,
        movedFrom: change === "moved" ? movedFrom[node.localPath] : undefined,
        children: [],
      });
      continue;
    }
    const children = filterFileNav(node.children, changeByStem, movedFrom);
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
      const full_name = [...suiteParts, node.label].join(" > ");
      const file_path = node.sourcePath ?? "";
      const change = file_path
        ? overlay.tests[testIdentityKey({ file_path, full_name })]
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
        node.subject_file_path,
        node.subject_name ?? node.label,
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
