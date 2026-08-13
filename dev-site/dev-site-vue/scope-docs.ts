/**
 * Package / directory / file scope prose for the Spec pane.
 * Prefer adjacent implementation JSDoc; fall back to the test file itself.
 */

const TEST_FILE_RE = /\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/i;

/** Map `foo.test.ts` → candidate sibling implementation paths. */
export function adjacentSourcePaths(testFilePath: string): string[] {
  const m = testFilePath.match(TEST_FILE_RE);
  if (!m) return [];
  const stem = testFilePath.slice(0, -m[0].length);
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue"];
  return exts.map((ext) => `${stem}${ext}`);
}

/** Repo paths to try for a module-stem scope summary (source first, then test). */
export function fileScopeDocCandidates(stemOrTestPath: string): string[] {
  if (TEST_FILE_RE.test(stemOrTestPath)) {
    return [...adjacentSourcePaths(stemOrTestPath), stemOrTestPath];
  }
  // Module stem (no extension) or plain source path.
  const stem = stemOrTestPath.replace(/\.(tsx?|jsx?|mjs|cjs)$/i, "");
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  return [
    ...exts.map((ext) => `${stem}${ext}`),
    ...exts.flatMap((ext) => [`${stem}.test${ext}`, `${stem}.spec${ext}`]),
  ];
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
