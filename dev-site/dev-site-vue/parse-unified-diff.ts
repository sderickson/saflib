export type DiffLineKind = "hunk" | "add" | "del" | "ctx" | "meta";

export type DiffDisplayLine = {
  kind: DiffLineKind;
  /** Line body without leading diff marker (+/-/space). */
  text: string;
};

export type ParsedDiffFile = {
  /** Repo-relative path used for links (new file, or old path when deleted). */
  path: string;
  oldPath?: string;
  newPath?: string;
  lines: DiffDisplayLine[];
};

export function parseUnifiedDiff(raw: string): ParsedDiffFile[] {
  const text = raw.replace(/\r\n/g, "\n");
  if (!text.trim()) return [];

  const blocks = text.split(/\n(?=diff --git )/).filter((b) => b.trim());
  const files: ParsedDiffFile[] = [];
  for (const block of blocks) {
    const parsed = parseDiffGitBlock(block);
    if (parsed) files.push(parsed);
  }
  return files;
}

function parseDiffGitBlock(block: string): ParsedDiffFile | null {
  const lines = block.split("\n");
  const head = lines[0];
  if (!head?.startsWith("diff --git ")) return null;

  const { oldPath, newPath } = parseDiffGitPaths(head);
  const linkPath =
    newPath && newPath !== "/dev/null"
      ? newPath
      : oldPath && oldPath !== "/dev/null"
        ? oldPath
        : "";

  const body: DiffDisplayLine[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("@@")) {
      body.push({ kind: "hunk", text: line });
      continue;
    }
    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      body.push({ kind: "meta", text: line });
      continue;
    }
    if (line.startsWith("+")) {
      body.push({ kind: "add", text: line.slice(1) });
      continue;
    }
    if (line.startsWith("-")) {
      body.push({ kind: "del", text: line.slice(1) });
      continue;
    }
    if (line.startsWith(" ")) {
      body.push({ kind: "ctx", text: line.slice(1) });
      continue;
    }
    if (line.length > 0) {
      body.push({ kind: "meta", text: line });
    }
  }

  if (!linkPath) return null;
  return {
    path: linkPath,
    oldPath: oldPath !== "/dev/null" ? oldPath : undefined,
    newPath: newPath !== "/dev/null" ? newPath : undefined,
    lines: body,
  };
}

function parseDiffGitPaths(head: string): { oldPath: string; newPath: string } {
  const rest = head.slice("diff --git ".length);
  const bMarker = rest.lastIndexOf(" b/");
  if (bMarker < 0) {
    return { oldPath: rest, newPath: rest };
  }
  const oldRaw = rest.slice(0, bMarker);
  const newRaw = rest.slice(bMarker + 3);
  const oldPath = unquoteGitPath(oldRaw.replace(/^a\//, ""));
  const newPath = unquoteGitPath(newRaw);
  return { oldPath, newPath };
}

function unquoteGitPath(segment: string): string {
  const s = segment.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    return s
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return s;
}
