export interface TestCaseLike {
  packageName: string;
  filePath: string;
  fullName: string;
}

export type TestTreeNodeKind = "dir" | "file" | "suite" | "test";

export interface TestTreeNode {
  id: string;
  label: string;
  kind: TestTreeNodeKind;
  children: TestTreeNode[];
}

function packageLocalPath(filePath: string, packageDirectory: string): string {
  const dir = packageDirectory.replace(/^\/+|\/+$/g, "");
  if (!dir) return filePath;
  const prefix = dir.endsWith("/") ? dir : `${dir}/`;
  if (filePath === dir) return ".";
  if (filePath.startsWith(prefix)) return filePath.slice(prefix.length);
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

/**
 * Build a nested test tree for one package:
 * path dirs → file → describe suites → it leaf.
 */
export function buildPackageTestTree(
  tests: TestCaseLike[],
  packageName: string,
  packageDirectory: string = "",
): TestTreeNode[] {
  const root: TestTreeNode = {
    id: `pkg:${packageName}`,
    label: packageName,
    kind: "dir",
    children: [],
  };

  const filtered = tests.filter((t) => t.packageName === packageName);
  for (const t of filtered) {
    const local = packageLocalPath(t.filePath, packageDirectory);
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
