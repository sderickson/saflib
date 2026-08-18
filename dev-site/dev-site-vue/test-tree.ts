export interface TestCaseLike {
  packageName: string;
  filePath: string;
  fullName: string;
  subjectName?: string | null;
  subjectSignature?: string | null;
  subjectDocstring?: string | null;
  subjectFilePath?: string | null;
  subjectConfidence?: "adjacent" | "package" | null;
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
  subjectName?: string | null;
  subjectSignature?: string | null;
  subjectDocstring?: string | null;
  subjectConfidence?: "adjacent" | "package" | null;
  subjectFilePath?: string | null;
  /**
   * Packages/files that import the subject.
   * Rendered under signature/doc on suite cards.
   */
  usedBy?: Array<{
    packageName: string;
    filePath: string;
    repoPath: string;
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
  packageName: string;
  filePath: string;
  name: string;
  kind: string;
  signature?: string | null;
  docstring?: string | null;
  usedBy?: Array<{
    packageName: string;
    filePath: string;
    repoPath: string;
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
  packageName: string,
): boolean {
  const vueish = (filePath: string) =>
    filePath.endsWith(".vue") || VUE_ROLE_SUFFIX_RE.test(toModuleStem(filePath));
  return (
    exports.some((e) => e.packageName === packageName && vueish(e.filePath)) ||
    tests.some((t) => t.packageName === packageName && vueish(t.filePath))
  );
}

function isHiddenVueCompanion(repoOrLocalPath: string): boolean {
  const base = repoOrLocalPath.split("/").pop() ?? repoOrLocalPath;
  return VUE_HIDDEN_FILE_RE.test(base);
}

export function packageLocalPath(
  filePath: string,
  packageDirectory: string,
  productRoot: string = "",
): string {
  const parts = [productRoot, packageDirectory]
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  const prefix = parts.join("/");
  if (!prefix) return filePath;
  const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
  if (filePath === prefix) return ".";
  if (filePath.startsWith(withSlash)) return filePath.slice(withSlash.length);
  const dir = packageDirectory.replace(/^\/+|\/+$/g, "");
  if (dir) {
    const d = dir.endsWith("/") ? dir : `${dir}/`;
    if (filePath.startsWith(d)) return filePath.slice(d.length);
  }
  return filePath;
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
  if (!t.subjectName || t.subjectName !== suiteLabel) return;
  if (node.subjectName) return;
  node.subjectName = t.subjectName;
  node.subjectSignature = t.subjectSignature ?? null;
  node.subjectDocstring = t.subjectDocstring ?? null;
  node.subjectConfidence = t.subjectConfidence ?? null;
  node.subjectFilePath = t.subjectFilePath ?? null;
}

function addSuitesAndLeaf(fileNode: TestTreeNode, t: TestCaseLike): void {
  const suiteParts = t.fullName.split(" > ").map((s) => s.trim());
  const leaf = suiteParts.pop() ?? t.fullName;
  let node = fileNode;
  for (const suite of suiteParts) {
    node = ensureChild(node, suite, "suite");
    attachSubjectToSuite(node, t, suite);
  }
  ensureChild(node, leaf, "test", t.filePath);
}

function packageTests(
  tests: TestCaseLike[],
  packageName: string,
): TestCaseLike[] {
  return tests.filter((t) => t.packageName === packageName);
}

function packageExports(
  exports: ExportLike[],
  packageName: string,
): ExportLike[] {
  return exports.filter((e) => e.packageName === packageName);
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
  packageName: string,
  packageDirectory: string,
  productRoot: string,
  options: ModuleNavOptions = {},
): ModuleUnit[] {
  const byStem = new Map<string, ModuleUnit>();
  const stemOf = (local: string) =>
    options.vueBundles ? toVueBundleStem(local) : toModuleStem(local);

  const touch = (
    stem: string,
    side: "source" | "test",
    repoPath: string,
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
      if (!unit.sourceRepoPaths.includes(repoPath)) {
        unit.sourceRepoPaths.push(repoPath);
      }
      unit.sourceRepoPath = pickPreferredSource(unit.sourceRepoPaths);
      if (cardExport) unit.hasCardExports = true;
      if (repoPath.endsWith(".vue") && !VUE_ASYNC_FILE_RE.test(repoPath)) {
        unit.hasVueComponent = true;
      }
      if (VUE_ASYNC_FILE_RE.test(repoPath)) unit.loadableAsync = true;
    } else {
      if (!unit.testRepoPaths.includes(repoPath)) {
        unit.testRepoPaths.push(repoPath);
      }
      unit.testRepoPath = unit.testRepoPaths[0] ?? null;
    }
    if (unit.sourceRepoPath && unit.testRepoPath) unit.presence = "both";
    else if (unit.sourceRepoPath) unit.presence = "source";
    else unit.presence = "test";
  };

  for (const e of packageExports(exports, packageName)) {
    const local = packageLocalPath(e.filePath, packageDirectory, productRoot);
    if (TEST_SUFFIX_RE.test(local)) continue;
    // Fold `*.fake.ts` into the product request stem (not a separate nav leaf).
    if (FAKE_SUFFIX_RE.test(local)) continue;
    touch(
      stemOf(local),
      "source",
      e.filePath,
      isCardExport(e.kind) && !isHiddenVueCompanion(e.filePath),
    );
  }
  for (const t of packageTests(tests, packageName)) {
    const local = packageLocalPath(t.filePath, packageDirectory, productRoot);
    touch(stemOf(local), "test", t.filePath);
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
  packageName: string,
  packageDirectory: string = "",
  productRoot: string = "",
  options: ModuleNavOptions = {},
): TestFileNavNode[] {
  const root: TestFileNavNode = {
    id: `nav:${packageName}`,
    label: packageName,
    kind: "dir",
    localPath: "",
    children: [],
  };

  for (const unit of collectModuleUnits(
    exports,
    tests,
    packageName,
    packageDirectory,
    productRoot,
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
  packageName: string,
  packageDirectory: string = "",
  productRoot: string = "",
): TestFileNavNode[] {
  const entitiesDir: TestFileNavNode = {
    id: `nav:${packageName}/dir:${DB_ENTITY_NAV_DIR}`,
    label: DB_ENTITY_NAV_DIR,
    kind: "dir",
    localPath: DB_ENTITY_NAV_DIR,
    children: [...entityNames]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        id: `nav:${packageName}/file:${DB_ENTITY_NAV_DIR}/${name}`,
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
    packageName,
    packageDirectory,
    productRoot,
    { excludeStem: isDbPackageHiddenModuleStem },
  );

  return [entitiesDir, ...modules];
}

/** @deprecated Prefer {@link buildModuleFileNav}. */
export function buildTestFileNav(
  tests: TestCaseLike[],
  packageName: string,
  packageDirectory: string = "",
  productRoot: string = "",
): TestFileNavNode[] {
  return buildModuleFileNav([], tests, packageName, packageDirectory, productRoot);
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
          s.subjectName === exp.name ||
          s.label === exp.name ||
          (s.subjectFilePath === exp.filePath && s.subjectName === exp.name),
      ) ?? null;
    if (suite) matched.add(suite.id);
    cards.push({
      id: suite?.id ?? `export:${exp.filePath}:${exp.name}`,
      label: exp.name,
      kind: "suite",
      children: suite?.children ?? [],
      subjectName: exp.name,
      subjectSignature: exp.signature ?? suite?.subjectSignature ?? null,
      subjectDocstring: exp.docstring ?? suite?.subjectDocstring ?? null,
      subjectFilePath: exp.filePath,
      subjectConfidence: suite?.subjectConfidence ?? null,
      usedBy: exp.usedBy?.length ? exp.usedBy : null,
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
  packageName: string,
  packageDirectory: string = "",
  productRoot: string = "",
  scope: TestScope = { kind: "all" },
  options: ModuleNavOptions = {},
): TestTreeNode[] {
  const units = collectModuleUnits(
    exports,
    tests,
    packageName,
    packageDirectory,
    productRoot,
    options,
  ).filter(
    (u) =>
      !options.excludeStem?.(u.stem) &&
      !(options.vueBundles && isLoneAsyncUnit(u)) &&
      matchesStemScope(u.stem, scope, options.vueBundles),
  );

  const pkgExports = packageExports(exports, packageName);
  const pkgTests = packageTests(tests, packageName);

  const unitExports = (unit: ModuleUnit) => {
    const paths = new Set(unit.sourceRepoPaths);
    return pkgExports.filter(
      (e) => paths.has(e.filePath) && !isHiddenVueCompanion(e.filePath),
    );
  };
  const unitTests = (unit: ModuleUnit) => {
    const paths = new Set(unit.testRepoPaths);
    return pkgTests.filter((t) => paths.has(t.filePath));
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
    id: `pkg:${packageName}:${scope.kind}:${scope.kind === "all" ? "" : scope.localPath}`,
    label: packageName,
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
  packageName: string,
  packageDirectory: string = "",
  productRoot: string = "",
  scope: TestScope = { kind: "all" },
): TestTreeNode[] {
  return buildPackageSpecTree(
    [],
    tests,
    packageName,
    packageDirectory,
    productRoot,
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
