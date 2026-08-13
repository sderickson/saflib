import ts from "typescript";

const DOCSTRING_MAX_LEN = 200;

/**
 * First prose line of a leading JSDoc block on `node`, or `null`.
 * Skips `@tags`; prefers `/**` over `//` / plain block comments.
 */
export function leadingDocstring(
  sf: ts.SourceFile,
  node: ts.Node,
): string | null {
  const text = sf.getFullText();
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart());
  if (!ranges?.length) return null;

  // Prefer the last /** ... */ closest to the declaration.
  let jsdoc: string | undefined;
  for (const range of ranges) {
    const comment = text.slice(range.pos, range.end);
    if (comment.startsWith("/**")) {
      jsdoc = comment;
    }
  }
  if (!jsdoc) return null;

  const body = jsdoc.replace(/^\/\*\*?/, "").replace(/\*\/$/, "");
  for (const rawLine of body.split("\n")) {
    let line = rawLine.replace(/^\s*\*\s?/, "").trim();
    if (!line || line.startsWith("@")) continue;
    line = line.replace(/\s+/g, " ").trim();
    if (!line) continue;
    return line.length > DOCSTRING_MAX_LEN
      ? line.slice(0, DOCSTRING_MAX_LEN)
      : line;
  }
  return null;
}
