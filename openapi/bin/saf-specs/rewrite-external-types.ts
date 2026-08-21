import type { ExternalSchemaProvenance } from "./resolve-pkg-refs.ts";

/**
 * Replace inlined / aliased external schemas in openapi-typescript output with
 * `import type` aliases from the owning package's `schemas/*` fragments.
 */
export function rewriteExternalSchemaTypes(
  dtsSource: string,
  externalSchemas: Map<string, ExternalSchemaProvenance>,
): string {
  if (externalSchemas.size === 0) return dtsSource;

  const imports: string[] = [];
  const aliasBySchema = new Map<string, string>();
  let i = 0;
  for (const [schemaName, prov] of [...externalSchemas.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const alias = `_Ext${i++}_${sanitizeIdent(schemaName)}`;
    aliasBySchema.set(schemaName, alias);
    imports.push(
      `import type { ${prov.schemaName} as ${alias} } from "${prov.packageName}/schemas/${prov.schemaName}";`,
    );
  }

  let result = dtsSource;
  for (const [schemaName, alias] of aliasBySchema) {
    result = replaceSchemaProperty(result, schemaName, alias);
  }

  if (imports.length === 0) return result;
  return `${imports.join("\n")}\n${result}`;
}

function sanitizeIdent(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

/**
 * Replace `SchemaName: <type-expr>` inside `schemas: { ... }` with
 * `SchemaName: Alias`. Handles both object types and `components["schemas"]["x"]` aliases.
 */
function replaceSchemaProperty(
  dts: string,
  schemaName: string,
  alias: string,
): string {
  // Prefer matching inside schemas block; fall back to global property match.
  const schemasIdx = dts.search(/schemas\s*:\s*\{/);
  if (schemasIdx === -1) {
    return replacePropertyAt(dts, 0, dts.length, schemaName, alias);
  }
  const braceStart = dts.indexOf("{", schemasIdx);
  const braceEnd = findMatchingBrace(dts, braceStart);
  if (braceEnd === -1) {
    return replacePropertyAt(dts, 0, dts.length, schemaName, alias);
  }
  const before = dts.slice(0, braceStart + 1);
  const inner = dts.slice(braceStart + 1, braceEnd);
  const after = dts.slice(braceEnd);
  return before + replacePropertyAt(inner, 0, inner.length, schemaName, alias) + after;
}

function replacePropertyAt(
  text: string,
  _start: number,
  _end: number,
  schemaName: string,
  alias: string,
): string {
  const re = new RegExp(
    `(^|[\\n\\r])([ \\t]*)(${escapeRegExp(schemaName)})(\\??)\\s*:`,
    "g",
  );
  let match: RegExpExecArray | null;
  let result = text;
  const replacements: Array<{ from: number; to: number; value: string }> = [];

  while ((match = re.exec(text)) !== null) {
    const propStart = match.index + match[1].length;
    const nameStart = propStart + match[2].length;
    const colonIdx = text.indexOf(":", nameStart + schemaName.length);
    if (colonIdx === -1) continue;
    let valueStart = colonIdx + 1;
    while (valueStart < text.length && /[ \t]/.test(text[valueStart]!)) {
      valueStart++;
    }
    const valueEnd = scanTypeExpressionEnd(text, valueStart);
    if (valueEnd === -1) continue;
    const indent = match[2];
    const optional = match[4];
    replacements.push({
      from: propStart,
      to: valueEnd,
      value: `${indent}${schemaName}${optional}: ${alias}`,
    });
  }

  // Apply from end so indices stay valid
  for (const r of replacements.sort((a, b) => b.from - a.from)) {
    result = result.slice(0, r.from) + r.value + result.slice(r.to);
  }
  return result;
}

function scanTypeExpressionEnd(text: string, start: number): number {
  if (text[start] === "{") {
    const end = findMatchingBrace(text, start);
    return end === -1 ? -1 : end + 1;
  }
  // components["schemas"]["x"] or other single-line-ish expr until `;` or `,` or newline+next prop
  let i = start;
  let depth = 0;
  let inStr: string | null = null;
  while (i < text.length) {
    const ch = text[i]!;
    if (inStr) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      i++;
      continue;
    }
    if (ch === "{" || ch === "(" || ch === "[") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}" || ch === ")" || ch === "]") {
      if (depth === 0) return i;
      depth--;
      i++;
      continue;
    }
    if (depth === 0 && (ch === ";" || ch === ",")) {
      return i;
    }
    if (depth === 0 && (ch === "\n" || ch === "\r")) {
      // End before next property / closing brace line
      const rest = text.slice(i + 1);
      if (/^[ \t]*[A-Za-z_"'}]/.test(rest) || /^[ \t]*\/\*/.test(rest)) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

function findMatchingBrace(text: string, openIdx: number): number {
  if (text[openIdx] !== "{") return -1;
  let depth = 0;
  let inStr: string | null = null;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
