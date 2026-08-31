export interface TestCaseLike {
  package_name: string;
  file_path: string;
  full_name: string;
  subject_name?: string | null;
  subject_signature?: string | null;
  subject_docstring?: string | null;
  subject_file_path?: string | null;
  subject_confidence?: "adjacent" | "package" | null;
}

export type TestTreeNodeKind = "dir" | "file" | "suite" | "test";

export interface TestTreeNode {
  id: string;
  label: string;
  kind: TestTreeNodeKind;
  children: TestTreeNode[];
  /** Repo-relative path for file nodes (opens in IDE/GitHub). */
  sourcePath?: string | null;
  /** Linked export — only attached to matching suite nodes. */
  subject_name?: string | null;
  subject_signature?: string | null;
  subject_docstring?: string | null;
  subject_confidence?: "adjacent" | "package" | null;
  subject_file_path?: string | null;
  /**
   * Packages/files that import the subject.
   * Rendered under signature/doc on suite cards.
   */
  used_by?: Array<{
    package_name: string;
    file_path: string;
    repo_path: string;
  }> | null;
  /** Present in Checkout compare mode. */
  change?: "added" | "removed" | "modified" | "moved";
}

/** Colocated source/test pairing for Spec nav. */
export type ModulePresence = "source" | "test" | "both";

/** Dir/file nav for Spec pane (no suites/tests). */
export type TestFileNavNodeKind = "dir" | "file";

export interface TestFileNavNode {
  id: string;
  label: string;
  kind: TestFileNavNodeKind;
  /**
   * Package-local path. For file nodes this is the **module stem**
   * (`document-requirements/validate-document-requirements`), not a filename.
   */
  localPath: string;
  children: TestFileNavNode[];
  /** Present on file (module) nodes: source-only / test-only / both. */
  presence?: ModulePresence;
  /** Source module has ≥1 function/class/const export (vs types-only). */
  hasCardExports?: boolean;
  /** This nav leaf is a Vue component bundle (SFC + same-prefix companions). */
  hasVueComponent?: boolean;
  /** A colocated `*Async.vue` exists for this bundle. */
  loadableAsync?: boolean;
  /** Repo path to the source file when present. */
  sourceRepoPath?: string | null;
  /** Repo path to the colocated test file when present. */
  testRepoPath?: string | null;
  /** Present in Checkout compare mode for file (module) nodes. */
  change?: "added" | "removed" | "modified" | "moved";
  /** Previous module stem when `change` is `moved`. */
  movedFrom?: string;
}

export type TestScope =
  | { kind: "all" }
  | { kind: "dir"; localPath: string }
  | { kind: "file"; localPath: string };

export interface ExportLike {
  package_name: string;
  file_path: string;
  name: string;
  kind: string;
  signature?: string | null;
  docstring?: string | null;
  used_by?: Array<{
    package_name: string;
    file_path: string;
    repo_path: string;
  }> | null;
  change?: "added" | "removed" | "modified" | "moved";
}

const TEST_SUFFIX_RE = /\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/i;
const FAKE_SUFFIX_RE = /\.fake\.(tsx?|jsx?|mjs|cjs)$/i;
const SOURCE_EXT_RE = /\.(tsx?|jsx?|mjs|cjs|vue)$/i;
const VUE_ROLE_SUFFIX_RE = /\.(loader|logic|strings|fixture)$/i;
const VUE_ASYNC_STEM_RE = /Async$/;
const VUE_ASYNC_FILE_RE = /Async\.vue$/i;
const VUE_HIDDEN_FILE_RE = /(Async\.vue|\.(strings|fixture)\.(tsx?|jsx?))$/i;

/** Strip `.test.ts` / `.fake.ts` / `.ts` / `.vue` (etc.) to the colocated module stem. */
export function toModuleStem(localOrFilePath: string): string {
  if (TEST_SUFFIX_RE.test(localOrFilePath)) {
    return localOrFilePath.replace(TEST_SUFFIX_RE, "");
  }
  if (FAKE_SUFFIX_RE.test(localOrFilePath)) {
    return localOrFilePath.replace(FAKE_SUFFIX_RE, "");
  }
  return localOrFilePath.replace(SOURCE_EXT_RE, "");
}

/**
 * Vue companion grouping: `Home.vue` + `Home.loader.ts` + `HomeAsync.vue` +
 * `Home.logic.ts` (+ tests) share one nav stem. Idempotent on already-bundled
 * stems.
 */
export function toVueBundleStem(localOrFilePath: string): string {
  let stem = toModuleStem(localOrFilePath);
  stem = stem.replace(VUE_ASYNC_STEM_RE, "");
  stem = stem.replace(VUE_ROLE_SUFFIX_RE, "");
  return stem;
}

export function packageHasVueFiles(
  exports: ExportLike[],
  tests: TestCaseLike[],
  package_name: string,
): boolean {
  const vueish = (file_path: string) =>
    file_path.endsWith(".vue") || VUE_ROLE_SUFFIX_RE.test(toModuleStem(file_path));
  return (
    exports.some((e) => e.package_name === package_name && vueish(e.file_path)) ||
    tests.some((t) => t.package_name === package_name && vueish(t.file_path))
  );
}

function isHiddenVueCompanion(repoOrLocalPath: string): boolean {
  const base = repoOrLocalPath.split("/").pop() ?? repoOrLocalPath;
  return VUE_HIDDEN_FILE_RE.test(base);
}

export function packageLocalPath(
  file_path: string,
  package_directory: string,
  product_root: string = "",
): string {
  const parts = [product_root, package_directory]
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  const prefix = parts.join("/");
  if (!prefix) return file_path;
  const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
  if (file_path === prefix) return ".";
  if (file_path.startsWith(withSlash)) return file_path.slice(withSlash.length);
  const dir = package_directory.replace(/^\/+|\/+$/g, "");
  if (dir) {
    const d = dir.endsWith("/") ? dir : `${dir}/`;
    if (file_path.startsWith(d)) return file_path.slice(d.length);
  }
  return file_path;
}

function ensureChild(
  parent: TestTreeNode,
  label: string,
  kind: TestTreeNodeKind,
  sourcePath?: string,
): TestTreeNode {
  let child = parent.children.find((c) => c.label === label && c.kind === kind);
  if (!child) {
    child = {
      id: `${parent.id}/${kind}:${label}`,
      label,
      kind,
      children: [],
      ...(sourcePath ? { sourcePath } : {}),
    };
    parent.children.push(child);
  } else if (sourcePath && !child.sourcePath) {
    child.sourcePath = sourcePath;
  }
  return child;
}

function ensureNavChild(
  parent: TestFileNavNode,
  label: string,
  kind: TestFileNavNodeKind,
  localPath: string,
): TestFileNavNode {
  let child = parent.children.find((c) => c.label === label && c.kind === kind);
  if (!child) {
    child = {
      id: `${parent.id}/${kind}:${localPath}`,
      label,
      kind,
      localPath,
      children: [],
    };
    parent.children.push(child);
  }
  return child;
}

function attachSubjectToSuite(
  node: TestTreeNode,
  t: TestCaseLike,
  suiteLabel: string,
): void {
  if (!t.subject_name || t.subject_name !== suiteLabel) return;
  if (node.subject_name) return;
  node.subject_name = t.subject_name;
  node.subject_signature = t.subject_signature ?? null;
  node.subject_docstring = t.subject_docstring ?? null;
  node.subject_confidence = t.subject_confidence ?? null;
  node.subject_file_path = t.subject_file_path ?? null;
}

function addSuitesAndLeaf(fileNode: TestTreeNode, t: TestCaseLike): void {
  const suiteParts = t.full_name.split(" > ").map((s) => s.trim());
  const leaf = suiteParts.pop() ?? t.full_name;
  let node = fileNode;
  for (const suite of suiteParts) {
    node = ensureChild(node, suite, "suite");
    attachSubjectToSuite(node, t, suite);
  }
  ensureChild(node, leaf, "test", t.file_path);
}

function packageTests(
  tests: TestCaseLike[],
  package_name: string,
): TestCaseLike[] {
  return tests.filter((t) => t.package_name === package_name);
}

function packageExports(
  exports: ExportLike[],
  package_name: string,
): ExportLike[] {
  return exports.filter((e) => e.package_name === package_name);
}

/** Exports worth showing as Spec cards (executable surface). */
const CARD_EXPORT_KINDS = new Set(["function", "class", "const"]);

export function isCardExport(kind: string): boolean {
  return CARD_EXPORT_KINDS.has(kind);
}

interface ModuleUnit {
  stem: string;
  presence: ModulePresence;
  hasCardExports: boolean;
  hasVueComponent: boolean;
  loadableAsync: boolean;
  sourceRepoPath: string | null;
  testRepoPath: string | null;
  sourceRepoPaths: string[];
  testRepoPaths: string[];
}

function pickPreferredSource(paths: string[]): string | null {
  const vue = paths.find(
    (p) => p.endsWith(".vue") && !VUE_ASYNC_FILE_RE.test(p),
  );
  if (vue) return vue;
  const nonHidden = paths.find((p) => !isHiddenVueCompanion(p));
  return nonHidden ?? paths[0] ?? null;
}

function collectModuleUnits(
  exports: ExportLike[],
  tests: TestCaseLike[],
  package_name: string,
  package_directory: string,
  product_root: string,
  options: ModuleNavOptions = {},
): ModuleUnit[] {
  const byStem = new Map<string, ModuleUnit>();
  const stemOf = (local: string) =>
    options.vueBundles ? toVueBundleStem(local) : toModuleStem(local);

  const touch = (
    stem: string,
    side: "source" | "test",
    repo_path: string,
    cardExport = false,
  ): void => {
    let unit = byStem.get(stem);
    if (!unit) {
      unit = {
        stem,
        presence: side,
        hasCardExports: false,
        hasVueComponent: false,
        loadableAsync: false,
        sourceRepoPath: null,
        testRepoPath: null,
        sourceRepoPaths: [],
        testRepoPaths: [],
      };
      byStem.set(stem, unit);
    }
    if (side === "source") {
      if (!unit.sourceRepoPaths.includes(repo_path)) {
        unit.sourceRepoPaths.push(repo_path);
      }
      unit.sourceRepoPath = pickPreferredSource(unit.sourceRepoPaths);
      if (cardExport) unit.hasCardExports = true;
      if (repo_path.endsWith(".vue") && !VUE_ASYNC_FILE_RE.test(repo_path)) {
        unit.hasVueComponent = true;
      }
      if (VUE_ASYNC_FILE_RE.test(repo_path)) unit.loadableAsync = true;
    } else {
      if (!unit.testRepoPaths.includes(repo_path)) {
        unit.testRepoPaths.push(repo_path);
      }
      unit.testRepoPath = unit.testRepoPaths[0] ?? null;
    }
    if (unit.sourceRepoPath && unit.testRepoPath) unit.presence = "both";
    else if (unit.sourceRepoPath) unit.presence = "source";
    else unit.presence = "test";
  };

  for (const e of packageExports(exports, package_name)) {
    const local = packageLocalPath(e.file_path, package_directory, product_root);
    if (TEST_SUFFIX_RE.test(local)) continue;
    // Fold `*.fake.ts` into the product request stem (not a separate nav leaf).
    if (FAKE_SUFFIX_RE.test(local)) continue;
    touch(
      stemOf(local),
      "source",
      e.file_path,
      isCardExport(e.kind) && !isHiddenVueCompanion(e.file_path),
    );
  }
  for (const t of packageTests(tests, package_name)) {
    const local = packageLocalPath(t.file_path, package_directory, product_root);
    touch(stemOf(local), "test", t.file_path);
  }

  return [...byStem.values()].sort((a, b) => a.stem.localeCompare(b.stem));
}

function matchesStemScope(
  stem: string,
  scope: TestScope,
  vueBundles = false,
): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "dir") {
    const prefix = scope.localPath.replace(/\/+$/, "");
    return stem === prefix || stem.startsWith(`${prefix}/`);
  }
  const wanted = vueBundles
    ? toVueBundleStem(scope.localPath)
    : toModuleStem(scope.localPath);
  return wanted === stem;
}

export type ModuleNavOptions = {
  /** Drop module stems for which this returns true (e.g. db `queries/`). */
  excludeStem?: (stem: string) => boolean;
  /**
   * Fold Vue companions (`*.vue`, `*.loader.ts`, `*Async.vue`, `*.logic.ts`,
   * colocated tests) into one nav leaf. Hide lone `*Async.vue` files.
   */
  vueBundles?: boolean;
};

function isLoneAsyncUnit(unit: ModuleUnit): boolean {
  return (
    unit.loadableAsync &&
    !unit.hasVueComponent &&
    unit.testRepoPaths.length === 0 &&
    unit.sourceRepoPaths.every((p) => VUE_ASYNC_FILE_RE.test(p))
  );
}

/**
 * Nav tree of colocated modules (dirs + stems), with source/test/both presence.
 */
export function buildModuleFileNav(
  exports: ExportLike[],
  tests: TestCaseLike[],
  package_name: string,
  package_directory: string = "",
  product_root: string = "",
  options: ModuleNavOptions = {},
): TestFileNavNode[] {
  const root: TestFileNavNode = {
    id: `nav:${package_name}`,
    label: package_name,
    kind: "dir",
    localPath: "",
    children: [],
  };

  for (const unit of collectModuleUnits(
    exports,
    tests,
    package_name,
    package_directory,
    product_root,
    options,
  )) {
    if (options.excludeStem?.(unit.stem)) continue;
    if (options.vueBundles && isLoneAsyncUnit(unit)) continue;
    const parts = unit.stem.split("/").filter(Boolean);
    const fileLabel = parts.pop() ?? unit.stem;
    let node = root;
    let acc = "";
    for (const dir of parts) {
      acc = acc ? `${acc}/${dir}` : dir;
      node = ensureNavChild(node, dir, "dir", acc);
    }
    const leaf = ensureNavChild(node, fileLabel, "file", unit.stem);
    leaf.presence = unit.presence;
    leaf.hasCardExports = unit.hasCardExports;
    leaf.hasVueComponent = unit.hasVueComponent;
    leaf.loadableAsync = unit.loadableAsync;
    leaf.sourceRepoPath = unit.sourceRepoPath;
    leaf.testRepoPath = unit.testRepoPath;
  }

  sortNav(root);
  return root.children;
}

/** Virtual nav folder for drizzle table+query inventory in db Spec panes. */
export const DB_ENTITY_NAV_DIR = "entities";

/** Hide query/schema inventory from the normal module tree on db packages (shown under `entities/`). */
export function isDbPackageHiddenModuleStem(stem: string): boolean {
  const s = stem.replace(/\/+$/, "");
  return (
    s === "schemas" ||
    s.startsWith("schemas/") ||
    s === "queries" ||
    s.startsWith("queries/")
  );
}

/**
 * Hide request aggregator barrels on SDK packages (`index.ts`, `index.fakes.ts`
 * under `requests/`). Per-route `*.fake.ts` files are folded via {@link toModuleStem}.
 */
export function isSdkPackageHiddenModuleStem(stem: string): boolean {
  const s = stem.replace(/\/+$/, "");
  if (s === "requests" || !s.startsWith("requests/")) return false;
  const base = s.split("/").pop() ?? s;
  return base === "index" || base === "index.fakes";
}

export function isDbEntityNavPath(localPath: string): boolean {
  const p = localPath.replace(/\/+$/, "");
  return (
    p === DB_ENTITY_NAV_DIR || p.startsWith(`${DB_ENTITY_NAV_DIR}/`)
  );
}

/**
 * Scope helpers for the virtual `entities/` nav:
 * - `undefined` — not an entity-only scope (normal modules, or `all`)
 * - `null` — all entities (`dir: entities`)
 * - `string` — one entity name (`file: entities/<name>`)
 */
export function dbEntitySelectionFromScope(
  scope: TestScope,
): string | null | undefined {
  if (scope.kind === "all") return undefined;
  if (scope.kind === "dir") {
    const p = scope.localPath.replace(/\/+$/, "");
    if (p === DB_ENTITY_NAV_DIR) return null;
    return undefined;
  }
  const stem = toModuleStem(scope.localPath);
  if (!isDbEntityNavPath(stem)) return undefined;
  if (stem === DB_ENTITY_NAV_DIR) return null;
  return stem.slice(DB_ENTITY_NAV_DIR.length + 1) || null;
}

/**
 * Db Spec nav: virtual `entities/` dir (table+query inventory) plus normal
 * modules with `schemas/` and `queries/` omitted (covered by `entities/`).
 */
export function buildDbPackageFileNav(
  entityNames: string[],
  exports: ExportLike[],
  tests: TestCaseLike[],
  package_name: string,
  package_directory: string = "",
  product_root: string = "",
): TestFileNavNode[] {
  const entitiesDir: TestFileNavNode = {
    id: `nav:${package_name}/dir:${DB_ENTITY_NAV_DIR}`,
    label: DB_ENTITY_NAV_DIR,
    kind: "dir",
    localPath: DB_ENTITY_NAV_DIR,
    children: [...entityNames]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        id: `nav:${package_name}/file:${DB_ENTITY_NAV_DIR}/${name}`,
        label: name,
        kind: "file" as const,
        localPath: `${DB_ENTITY_NAV_DIR}/${name}`,
        children: [],
        presence: "source" as const,
      })),
  };

  const modules = buildModuleFileNav(
    exports,
    tests,
    package_name,
    package_directory,
    product_root,
    { excludeStem: isDbPackageHiddenModuleStem },
  );

  return [entitiesDir, ...modules];
}

/** @deprecated Prefer {@link buildModuleFileNav}. */
export function buildTestFileNav(
  tests: TestCaseLike[],
  package_name: string,
  package_directory: string = "",
  product_root: string = "",
): TestFileNavNode[] {
  return buildModuleFileNav([], tests, package_name, package_directory, product_root);
}

function suitesFromTests(tests: TestCaseLike[]): TestTreeNode[] {
  const root: TestTreeNode = {
    id: "tmp-suites",
    label: "tmp",
    kind: "dir",
    children: [],
  };
  for (const t of tests) addSuitesAndLeaf(root, t);
  sortTree(root);
  return root.children.filter((c) => c.kind === "suite");
}

function mergeExportCards(
  exports: ExportLike[],
  suites: TestTreeNode[],
): TestTreeNode[] {
  const matched = new Set<string>();
  const cards: TestTreeNode[] = [];

  const cardExports = exports
    .filter((e) => isCardExport(e.kind))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const exp of cardExports) {
    const suite =
      suites.find(
        (s) =>
          s.subject_name === exp.name ||
          s.label === exp.name ||
          (s.subject_file_path === exp.file_path && s.subject_name === exp.name),
      ) ?? null;
    if (suite) matched.add(suite.id);
    cards.push({
      id: suite?.id ?? `export:${exp.file_path}:${exp.name}`,
      label: exp.name,
      kind: "suite",
      children: suite?.children ?? [],
      subject_name: exp.name,
      subject_signature: exp.signature ?? suite?.subject_signature ?? null,
      subject_docstring: exp.docstring ?? suite?.subject_docstring ?? null,
      subject_file_path: exp.file_path,
      subject_confidence: suite?.subject_confidence ?? null,
      used_by: exp.used_by?.length ? exp.used_by : null,
    });
  }

  for (const suite of suites) {
    if (matched.has(suite.id)) continue;
    cards.push(suite);
  }

  return cards;
}

/**
 * Spec cards for a scope: every card-worthy export (with importers/docs) plus
 * colocated suites. Dir/all wrap modules under dirs; file scope is flat cards.
 */
export function buildPackageSpecTree(
  exports: ExportLike[],
  tests: TestCaseLike[],
  package_name: string,
  package_directory: string = "",
  product_root: string = "",
  scope: TestScope = { kind: "all" },
  options: ModuleNavOptions = {},
): TestTreeNode[] {
  const units = collectModuleUnits(
    exports,
    tests,
    package_name,
    package_directory,
    product_root,
    options,
  ).filter(
    (u) =>
      !options.excludeStem?.(u.stem) &&
      !(options.vueBundles && isLoneAsyncUnit(u)) &&
      matchesStemScope(u.stem, scope, options.vueBundles),
  );

  const pkgExports = packageExports(exports, package_name);
  const pkgTests = packageTests(tests, package_name);

  const unitExports = (unit: ModuleUnit) => {
    const paths = new Set(unit.sourceRepoPaths);
    return pkgExports.filter(
      (e) => paths.has(e.file_path) && !isHiddenVueCompanion(e.file_path),
    );
  };
  const unitTests = (unit: ModuleUnit) => {
    const paths = new Set(unit.testRepoPaths);
    return pkgTests.filter((t) => paths.has(t.file_path));
  };

  if (scope.kind === "file") {
    const stem = options.vueBundles
      ? toVueBundleStem(scope.localPath)
      : toModuleStem(scope.localPath);
    const unit = units.find((u) => u.stem === stem);
    if (!unit) return [];
    return mergeExportCards(unitExports(unit), suitesFromTests(unitTests(unit)));
  }

  const root: TestTreeNode = {
    id: `pkg:${package_name}:${scope.kind}:${scope.kind === "all" ? "" : scope.localPath}`,
    label: package_name,
    kind: "dir",
    children: [],
  };

  const stripPrefix =
    scope.kind === "dir" ? scope.localPath.replace(/\/+$/, "") : "";

  for (const unit of units) {
    let relative = unit.stem;
    if (stripPrefix) {
      if (unit.stem === stripPrefix) {
        relative = unit.stem.split("/").pop() ?? unit.stem;
      } else if (unit.stem.startsWith(`${stripPrefix}/`)) {
        relative = unit.stem.slice(stripPrefix.length + 1);
      }
    }
    const parts = relative.split("/").filter(Boolean);
    const fileLabel = parts.pop() ?? relative;
    let node = root;
    for (const dir of parts) {
      node = ensureChild(node, dir, "dir");
    }
    const openPath = unit.sourceRepoPath ?? unit.testRepoPath ?? undefined;
    const fileNode = ensureChild(node, fileLabel, "file", openPath);

    const moduleExports = unitExports(unit);
    const moduleTests = unitTests(unit);
    for (const card of mergeExportCards(
      moduleExports,
      suitesFromTests(moduleTests),
    )) {
      fileNode.children.push(card);
    }
  }

  sortTree(root);
  return root.children;
}

/**
 * Suite/test tree for a scope (tests only). Prefer {@link buildPackageSpecTree}.
 */
export function buildPackageTestTree(
  tests: TestCaseLike[],
  package_name: string,
  package_directory: string = "",
  product_root: string = "",
  scope: TestScope = { kind: "all" },
): TestTreeNode[] {
  return buildPackageSpecTree(
    [],
    tests,
    package_name,
    package_directory,
    product_root,
    scope,
  );
}

function sortNav(node: TestFileNavNode): void {
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  for (const c of node.children) sortNav(c);
}

function sortTree(node: TestTreeNode): void {
  const order: Record<TestTreeNodeKind, number> = {
    dir: 0,
    file: 1,
    suite: 2,
    test: 3,
  };
  node.children.sort((a, b) => {
    const d = order[a.kind] - order[b.kind];
    if (d !== 0) return d;
    return a.label.localeCompare(b.label);
  });
  for (const c of node.children) sortTree(c);
}

/** Look up a module nav leaf by stem (normalizes old `*.test.ts` URLs). */
export function findModuleNavNode(
  nodes: TestFileNavNode[],
  stemOrPath: string,
  vueBundles = false,
): TestFileNavNode | null {
  const stem = vueBundles
    ? toVueBundleStem(stemOrPath)
    : toModuleStem(stemOrPath);
  for (const n of nodes) {
    if (n.kind === "file" && n.localPath === stem) return n;
    const hit = findModuleNavNode(n.children, stem, vueBundles);
    if (hit) return hit;
  }
  return null;
}
