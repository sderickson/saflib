import ts from "typescript";
import type { ImportEntry } from "./types.ts";

/**
 * Extract static import declarations from TypeScript/JavaScript source using
 * the syntactic parser only (no type-checker).
 *
 * Covers `import … from "…"`, `import "…"`, and `export … from "…"`
 * (re-export as an inbound edge). Skips dynamic `import()`.
 */
export function extractImports(source: string): ImportEntry[] {
  const sf = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const bySpecifier = new Map<string, Set<string>>();

  const add = (specifier: string, name: string | null) => {
    let names = bySpecifier.get(specifier);
    if (!names) {
      names = new Set();
      bySpecifier.set(specifier, names);
    }
    if (name !== null) names.add(name);
  };

  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (!clause) {
        add(specifier, null);
        continue;
      }
      if (clause.name) add(specifier, "default");
      const bindings = clause.namedBindings;
      if (bindings) {
        if (ts.isNamespaceImport(bindings)) {
          add(specifier, "*");
        } else if (ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) {
            const exported = el.propertyName?.text ?? el.name.text;
            add(specifier, exported);
          }
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const el of statement.exportClause.elements) {
          const exported = el.propertyName?.text ?? el.name.text;
          add(specifier, exported);
        }
      } else {
        add(specifier, "*");
      }
    }
  }

  return [...bySpecifier.entries()]
    .map(([specifier, names]) => ({
      specifier,
      names: [...names].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.specifier.localeCompare(b.specifier));
}
