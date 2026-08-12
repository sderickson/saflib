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
  /** Linked export — only attached to matching suite nodes. */
  subjectName?: string | null;
  subjectSignature?: string | null;
  subjectDocstring?: string | null;
  subjectConfidence?: "adjacent" | "package" | null;
  subjectFilePath?: string | null;
}

/** Dir/file nav for Spec pane (no suites/tests). */
export type TestFileNavNodeKind = "dir" | "file";

export interface TestFileNavNode {
  id: string;
  label: string;
  kind: TestFileNavNodeKind;
  /** Package-local path (`src`, `src/math.test.ts`). */
  localPath: string;
  children: TestFileNavNode[];
}

export type TestScope =
  | { kind: "all" }
  | { kind: "dir"; localPath: string }
  | { kind: "file"; localPath: string };

function packageLocalPath(
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
): TestTreeNode {
  let child = parent.children.find((c) => c.label === label && c.kind === kind);
  if (!child) {
    child = {
      id: `${parent.id}/${kind}:${label}`,
      label,
      kind,
      children: [],
    };
    parent.children.push(child);
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

function matchesScope(
  localPath: string,
  scope: TestScope,
): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "file") return localPath === scope.localPath;
  const prefix = scope.localPath.replace(/\/+$/, "");
  return localPath === prefix || localPath.startsWith(`${prefix}/`);
}

/**
 * Nav tree of test files only (dirs + files), package-local paths.
 */
export function buildTestFileNav(
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

  const seen = new Set<string>();
  for (const t of packageTests(tests, packageName)) {
    const local = packageLocalPath(t.filePath, packageDirectory, productRoot);
    if (seen.has(local)) continue;
    seen.add(local);

    const parts = local.split("/").filter(Boolean);
    const fileName = parts.pop() ?? local;
    let node = root;
    let acc = "";
    for (const dir of parts) {
      acc = acc ? `${acc}/${dir}` : dir;
      node = ensureNavChild(node, dir, "dir", acc);
    }
    ensureNavChild(node, fileName, "file", local);
  }

  sortNav(root);
  return root.children;
}

/**
 * Suite/test tree for a scope: all | one dir | one file.
 * File scope omits the file wrapper (suites are roots). Dir/all keep
 * dirs → files → suites under the scope.
 */
export function buildPackageTestTree(
  tests: TestCaseLike[],
  packageName: string,
  packageDirectory: string = "",
  productRoot: string = "",
  scope: TestScope = { kind: "all" },
): TestTreeNode[] {
  const root: TestTreeNode = {
    id: `pkg:${packageName}:${scope.kind}:${scope.kind === "all" ? "" : scope.localPath}`,
    label: packageName,
    kind: "dir",
    children: [],
  };

  const scoped = packageTests(tests, packageName).filter((t) =>
    matchesScope(
      packageLocalPath(t.filePath, packageDirectory, productRoot),
      scope,
    ),
  );

  if (scope.kind === "file") {
    for (const t of scoped) {
      addSuitesAndLeaf(root, t);
    }
    sortTree(root);
    return root.children;
  }

  const stripPrefix =
    scope.kind === "dir" ? scope.localPath.replace(/\/+$/, "") : "";

  for (const t of scoped) {
    const local = packageLocalPath(t.filePath, packageDirectory, productRoot);
    let relative = local;
    if (stripPrefix) {
      if (local === stripPrefix) relative = local.split("/").pop() ?? local;
      else if (local.startsWith(`${stripPrefix}/`)) {
        relative = local.slice(stripPrefix.length + 1);
      }
    }
    const parts = relative.split("/").filter(Boolean);
    const fileName = parts.pop() ?? relative;
    let node = root;
    for (const dir of parts) {
      node = ensureChild(node, dir, "dir");
    }
    node = ensureChild(node, fileName, "file");
    addSuitesAndLeaf(node, t);
  }

  sortTree(root);
  return root.children;
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
