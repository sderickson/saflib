/**
 * Package / directory / file scope prose for the Spec pane.
 * Prefer adjacent implementation JSDoc; fall back to the test file itself.
 */

/** Primary module file extensions, ranked for scope-doc picking. */
const PRIMARY_EXT = [
  ".vue",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".md",
];

/**
 * Prefix for `GET /api/repo/files` when loading a scope README / JSDoc.
 * Directories use `…/README` (stem-matches `README.md`); files use the module stem.
 */
export function scopeDocListPrefix(args: {
  kind: "all" | "dir" | "file";
  pkgPrefix: string;
  localPath: string;
  moduleStem: string;
}): string {
  if (args.kind === "all") return "";
  if (args.kind === "dir") {
    const base = [args.pkgPrefix, args.localPath].filter(Boolean).join("/");
    return `${base}/README`;
  }
  return [args.pkgPrefix, args.moduleStem].filter(Boolean).join("/");
}

function scopeDocRank(path: string, prefix: string): number {
  const rest = path.startsWith(prefix) ? path.slice(prefix.length) : `/${path}`;
  const primary = PRIMARY_EXT.indexOf(rest);
  if (primary !== -1) return primary;
  const test = rest.match(/^\.(test|spec)(\.[^.]+)$/i);
  if (test) {
    const ei = PRIMARY_EXT.indexOf(test[2]!.toLowerCase());
    return 20 + (ei === -1 ? 9 : ei);
  }
  return 40;
}

/** Prefer the primary source (or README) among prefix-listed files, then tests. */
export function pickScopeDocFile<T extends { path: string }>(
  files: T[],
  prefix: string,
): T | undefined {
  if (!files.length || !prefix) return undefined;
  return [...files].sort(
    (a, b) => scopeDocRank(a.path, prefix) - scopeDocRank(b.path, prefix),
  )[0];
}

export function summarizeScopeDoc(
  file: { path: string; content?: string } | undefined,
): string | null {
  if (!file?.content) return null;
  if (file.path.toLowerCase().endsWith(".md")) {
    return shortenMarkdownSummary(file.content);
  }
  return extractLeadingJsDocProse(file.content);
}

/**
 * Leading file-scope `/** ... *\/` only — must be the first non-trivial thing in
 * the file (after BOM / shebang / `"use strict"` / blanks). Ignores JSDoc on
 * later imports, types, or exports.
 */
export function extractLeadingJsDocProse(
  source: string,
  maxLen = 500,
): string | null {
  let i = 0;
  const n = source.length;
  if (source.charCodeAt(0) === 0xfeff) i = 1;

  const skipWs = () => {
    while (i < n && /\s/.test(source[i]!)) i++;
  };
  skipWs();

  if (source.startsWith("#!", i)) {
    const eol = source.indexOf("\n", i);
    i = eol === -1 ? n : eol + 1;
    skipWs();
  }

  const strict = source.slice(i).match(/^['"]use strict['"];?\s*/);
  if (strict) {
    i += strict[0].length;
    skipWs();
  }

  if (!source.startsWith("/**", i)) return null;
  const end = source.indexOf("*/", i + 3);
  if (end === -1) return null;
  const body = source.slice(i + 3, end);

  const lines: string[] = [];
  for (const raw of body.split("\n")) {
    let line = raw.replace(/^\s*\*\s?/, "").trim();
    if (!line) {
      if (lines.length) break;
      continue;
    }
    if (line.startsWith("@")) continue;
    lines.push(line);
  }
  if (!lines.length) return null;
  let prose = lines.join(" ");
  if (prose.length > maxLen) {
    prose = `${prose.slice(0, maxLen - 1).trimEnd()}…`;
  }
  return prose;
}

/**
 * Short plain-text summary of a README: optional title + first paragraph.
 */
export function shortenMarkdownSummary(md: string, maxLen = 500): string | null {
  let text = md.replace(/^\uFEFF/, "");
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) text = text.slice(end + 4);
  }
  text = text.trim();
  if (!text) return null;

  const lines = text.split("\n");
  let title = "";
  let i = 0;
  if (lines[0]?.startsWith("#")) {
    title = lines[0]!.replace(/^#+\s*/, "").trim();
    i = 1;
    while (i < lines.length && !lines[i]!.trim()) i++;
  }

  const para: string[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) {
      if (para.length) break;
      continue;
    }
    if (/^#+\s/.test(line) || /^```/.test(line) || /^\|/.test(line)) {
      if (para.length) break;
      continue;
    }
    para.push(line.replace(/^>\s*/, "").replace(/\*\*([^*]+)\*\*/g, "$1"));
  }

  const body = para.join(" ").trim();
  let out = title && body ? `${title} — ${body}` : title || body;
  if (!out) return null;
  if (out.length > maxLen) out = `${out.slice(0, maxLen - 1).trimEnd()}…`;
  return out;
}

export function parsePackageDescription(packageJsonText: string): string | null {
  try {
    const parsed = JSON.parse(packageJsonText) as { description?: unknown };
    return typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : null;
  } catch {
    return null;
  }
}
