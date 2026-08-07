import type { ImportSpec } from "../types.ts";

const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;
const DYN_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Regex-based import extraction. No AST / compiler dependency.
 * Handles `import`, `export … from`, and dynamic `import()`.
 */
export function extractImports(src: string): ImportSpec[] {
  const out: ImportSpec[] = [];
  const buf = src;

  const re = new RegExp(IMPORT_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(buf))) {
    const stmt = m[0];
    const isTypeOnly = /\bimport\s+type\b|\bexport\s+type\b/.test(stmt);
    out.push({ spec: m[1]!, isTypeOnly });
  }

  const dre = new RegExp(DYN_RE.source, "g");
  while ((m = dre.exec(buf))) {
    out.push({ spec: m[1]!, isTypeOnly: false });
  }

  return out;
}
