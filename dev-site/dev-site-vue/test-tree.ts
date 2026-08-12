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

/**
 * Build a nested test tree for one package:
 * path dirs → file → describe suites → it leaf.
 * Signature/docstring attach only to suite nodes whose title matches the subject.
 */
export function buildPackageTestTree(
  tests: TestCaseLike[],
  packageName: string,
  packageDirectory: string = "",
  productRoot: string = "",
): TestTreeNode[] {
  const root: TestTreeNode = {
    id: `pkg:${packageName}`,
    label: packageName,
    kind: "dir",
    children: [],
  };

  const filtered = tests.filter((t) => t.packageName === packageName);
  for (const t of filtered) {
    const local = packageLocalPath(t.filePath, packageDirectory, productRoot);
    const parts = local.split("/").filter(Boolean);
    const fileName = parts.pop() ?? local;
    let node = root;
    for (const dir of parts) {
      node = ensureChild(node, dir, "dir");
    }
    node = ensureChild(node, fileName, "file");

    const suiteParts = t.fullName.split(" > ").map((s) => s.trim());
    const leaf = suiteParts.pop() ?? t.fullName;
    for (const suite of suiteParts) {
      node = ensureChild(node, suite, "suite");
      attachSubjectToSuite(node, t, suite);
    }
    ensureChild(node, leaf, "test");
  }

  sortTree(root);
  return root.children;
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
