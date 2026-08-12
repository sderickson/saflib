import ts from "typescript";
import type { ExportEntry, ExportKind } from "./types.ts";

/**
 * Extract exported symbols from TypeScript/JavaScript source using the syntactic
 * parser only (`ts.createSourceFile` — no type-checker, no `node_modules`).
 *
 * Covers `export function` / `class` / `interface` / `type` / `const` (and
 * `let`/`var` as `"variable"`) / `enum`, plus `export { name }` / `export { name as
 * alias }` (named exports are tagged `"variable"` when kind can't be known from
 * the export clause alone). Skips `export * from` and default-export expressions
 * without a name.
 */
export function extractExports(source: string): ExportEntry[] {
  const sf = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const entries: ExportEntry[] = [];

  for (const statement of sf.statements) {
    if (ts.isExportDeclaration(statement)) {
      // export { a, b as c } [from "..."]
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const el of statement.exportClause.elements) {
          // el.name is the exported name (`bee` in `export { b as bee }`).
          entries.push({ name: el.name.text, kind: "variable" });
        }
      }
      continue;
    }

    if (!hasExportModifier(statement)) continue;

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      entries.push({ name: statement.name.text, kind: "function" });
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
      entries.push({ name: statement.name.text, kind: "class" });
      continue;
    }
    if (ts.isInterfaceDeclaration(statement)) {
      entries.push({ name: statement.name.text, kind: "interface" });
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement)) {
      entries.push({ name: statement.name.text, kind: "type" });
      continue;
    }
    if (ts.isEnumDeclaration(statement)) {
      entries.push({ name: statement.name.text, kind: "enum" });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      const kind = variableKind(statement.declarationList);
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          entries.push({ name: decl.name.text, kind });
        }
      }
    }
  }

  return entries;
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    ) ?? false
  );
}

function variableKind(
  list: ts.VariableDeclarationList,
): Extract<ExportKind, "const" | "variable"> {
  if ((list.flags & ts.NodeFlags.Const) !== 0) return "const";
  return "variable";
}
