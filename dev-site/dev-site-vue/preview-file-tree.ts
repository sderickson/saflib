export interface PreviewFile {
  path: string;
  status: "added" | "modified";
}

/**
 * A file can appear in more than one step's `files` list (e.g. added by one
 * step, then modified by a later step). Collapses to one entry per path:
 * `added` wins over `modified` if any occurrence says `added`.
 */
export function dedupePreviewFiles(files: PreviewFile[]): PreviewFile[] {
  const byPath = new Map<string, PreviewFile["status"]>();
  for (const f of files) {
    if (byPath.get(f.path) !== "added") {
      byPath.set(f.path, f.status);
    }
  }
  return [...byPath.entries()]
    .map(([path, status]) => ({ path, status }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export interface PreviewTreeNode {
  name: string;
  /** Full repo-relative path — only meaningful for a file (leaf) node. */
  path: string;
  status?: PreviewFile["status"];
  children: PreviewTreeNode[];
}

/** Builds a nested directory tree from deduped, sorted files, e.g. for a `tree`-style render. */
export function buildPreviewFileTree(files: PreviewFile[]): PreviewTreeNode[] {
  const root: PreviewTreeNode = { name: "", path: "", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const isLeaf = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === parts[i]);
      if (!child) {
        child = { name: parts[i], path, children: [] };
        node.children.push(child);
      }
      if (isLeaf) child.status = file.status;
      node = child;
    }
  }
  return root.children;
}
