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
  /** Repo path to the source file when present. */
  sourceRepoPath?: string | null;
  /** Repo path to the colocated test file when present. */
  testRepoPath?: string | null;
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
}

const TEST_SUFFIX_RE = /\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/i;
const SOURCE_EXT_RE = /\.(tsx?|jsx?|mjs|cjs)$/i;

/** Strip `.test.ts` / `.ts` (etc.) to the colocated module stem. */
export function toModuleStem(localOrFilePath: string): string {
  if (TEST_SUFFIX_RE.test(localOrFilePath)) {
    return localOrFilePath.replace(TEST_SUFFIX_RE, "");
  }
  return localOrFilePath.replace(SOURCE_EXT_RE, "");
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
  ensureChild(node, leaf, "test");
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
  sourceRepoPath: string | null;
  testRepoPath: string | null;
}

function collectModuleUnits(
  exports: ExportLike[],
  tests: TestCaseLike[],
  packageName: string,
  packageDirectory: string,
  productRoot: string,
): ModuleUnit[] {
  const byStem = new Map<string, ModuleUnit>();

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
        sourceRepoPath: null,
        testRepoPath: null,
      };
      byStem.set(stem, unit);
    }
    if (side === "source") {
      unit.sourceRepoPath = repoPath;
      if (cardExport) unit.hasCardExports = true;
    } else {
      unit.testRepoPath = repoPath;
    }
    if (unit.sourceRepoPath && unit.testRepoPath) unit.presence = "both";
    else if (unit.sourceRepoPath) unit.presence = "source";
    else unit.presence = "test";
  };

  for (const e of packageExports(exports, packageName)) {
    const local = packageLocalPath(e.filePath, packageDirectory, productRoot);
    if (TEST_SUFFIX_RE.test(local)) continue;
    touch(toModuleStem(local), "source", e.filePath, isCardExport(e.kind));
  }
  for (const t of packageTests(tests, packageName)) {
    const local = packageLocalPath(t.filePath, packageDirectory, productRoot);
    touch(toModuleStem(local), "test", t.filePath);
  }

  return [...byStem.values()].sort((a, b) => a.stem.localeCompare(b.stem));
}

function matchesStemScope(stem: string, scope: TestScope): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "dir") {
    const prefix = scope.localPath.replace(/\/+$/, "");
    return stem === prefix || stem.startsWith(`${prefix}/`);
  }
  return toModuleStem(scope.localPath) === stem;
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
  )) {
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
    leaf.sourceRepoPath = unit.sourceRepoPath;
    leaf.testRepoPath = unit.testRepoPath;
  }

  sortNav(root);
  return root.children;
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
): TestTreeNode[] {
  const units = collectModuleUnits(
    exports,
    tests,
    packageName,
    packageDirectory,
    productRoot,
  ).filter((u) => matchesStemScope(u.stem, scope));

  const pkgExports = packageExports(exports, packageName);
  const pkgTests = packageTests(tests, packageName);

  if (scope.kind === "file") {
    const stem = toModuleStem(scope.localPath);
    const unit = units.find((u) => u.stem === stem);
    const sourcePath = unit?.sourceRepoPath;
    const testPath = unit?.testRepoPath;
    const moduleExports = sourcePath
      ? pkgExports.filter((e) => e.filePath === sourcePath)
      : [];
    const moduleTests = testPath
      ? pkgTests.filter((t) => t.filePath === testPath)
      : [];
    return mergeExportCards(moduleExports, suitesFromTests(moduleTests));
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

    const moduleExports = unit.sourceRepoPath
      ? pkgExports.filter((e) => e.filePath === unit.sourceRepoPath)
      : [];
    const moduleTests = unit.testRepoPath
      ? pkgTests.filter((t) => t.filePath === unit.testRepoPath)
      : [];
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
): TestFileNavNode | null {
  const stem = toModuleStem(stemOrPath);
  for (const n of nodes) {
    if (n.kind === "file" && n.localPath === stem) return n;
    const hit = findModuleNavNode(n.children, stem);
    if (hit) return hit;
  }
  return null;
}
