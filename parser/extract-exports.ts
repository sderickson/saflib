import ts from "typescript";
import type { ExportEntry, ExportKind } from "./types.ts";
import { leadingDocstring } from "./jsdoc.ts";

/**
 * Extract exported symbols from TypeScript/JavaScript source using the syntactic
 * parser only (`ts.createSourceFile` — no type-checker, no `node_modules`).
 *
 * Covers `export function` / `class` / `interface` / `type` / `const` (and
 * `let`/`var` as `"variable"`) / `enum`, plus `export { name }` / `export { name as
 * alias }` (named exports are tagged `"variable"` when kind can't be known from
 * the export clause alone). Skips `export * from` and default-export expressions
 * without a name.
 *
 * Each entry includes a syntactic {@link ExportEntry.signature} for display/diff
 * and an optional {@link ExportEntry.docstring} from leading JSDoc.
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
          entries.push({
            name: el.name.text,
            kind: "variable",
            signature: null,
            docstring: null,
          });
        }
      }
      continue;
    }

    if (!hasExportModifier(statement)) continue;

    const docstring = leadingDocstring(sf, statement);

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      entries.push({
        name: statement.name.text,
        kind: "function",
        signature: functionLikeSignature(sf, statement),
        docstring,
      });
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
      entries.push({
        name: statement.name.text,
        kind: "class",
        signature: classSignature(sf, statement),
        docstring,
      });
      continue;
    }
    if (ts.isInterfaceDeclaration(statement)) {
      entries.push({
        name: statement.name.text,
        kind: "interface",
        signature: typeLiteralSignature(sf, statement),
        docstring,
      });
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement)) {
      entries.push({
        name: statement.name.text,
        kind: "type",
        signature: `= ${compact(statement.type.getText(sf))}`,
        docstring,
      });
      continue;
    }
    if (ts.isEnumDeclaration(statement)) {
      entries.push({
        name: statement.name.text,
        kind: "enum",
        signature: enumSignature(sf, statement),
        docstring,
      });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      const kind = variableKind(statement.declarationList);
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          entries.push({
            name: decl.name.text,
            kind,
            signature: variableSignature(sf, decl),
            // JSDoc lives on the variable statement, not each declarator.
            docstring,
          });
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

function functionLikeSignature(
  sf: ts.SourceFile,
  node: ts.SignatureDeclaration,
): string {
  const typeParams = node.typeParameters?.length
    ? `<${node.typeParameters.map((p) => p.getText(sf)).join(", ")}>`
    : "";
  const params = (node.parameters ?? [])
    .map((p) => compact(p.getText(sf)))
    .join(", ");
  const ret = node.type ? `: ${compact(node.type.getText(sf))}` : "";
  return `${typeParams}(${params})${ret}`;
}

function variableSignature(
  sf: ts.SourceFile,
  decl: ts.VariableDeclaration,
): string | null {
  if (decl.type && !decl.initializer) {
    return `: ${compact(decl.type.getText(sf))}`;
  }
  const init = decl.initializer;
  if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
    if (decl.type) {
      return `: ${compact(decl.type.getText(sf))}`;
    }
    return functionLikeSignature(sf, init);
  }
  if (decl.type) {
    return `: ${compact(decl.type.getText(sf))}`;
  }
  if (init) {
    const text = compact(init.getText(sf));
    if (text.length > 80) return `= ${text.slice(0, 77)}…`;
    return `= ${text}`;
  }
  return null;
}

function classSignature(
  sf: ts.SourceFile,
  node: ts.ClassDeclaration,
): string {
  const ctor = node.members.find(
    (m): m is ts.ConstructorDeclaration => ts.isConstructorDeclaration(m),
  );
  if (ctor) {
    return `constructor${functionLikeSignature(sf, ctor)}`;
  }
  const heritage = [
    ...(node.heritageClauses ?? []).flatMap((c) =>
      c.types.map((t) => compact(t.getText(sf))),
    ),
  ];
  return heritage.length ? `extends ${heritage.join(", ")}` : "(class)";
}

function typeLiteralSignature(
  sf: ts.SourceFile,
  node: ts.InterfaceDeclaration,
): string {
  const heritage = (node.heritageClauses ?? [])
    .flatMap((c) => c.types.map((t) => compact(t.getText(sf))))
    .join(", ");
  const members = node.members
    .slice(0, 6)
    .map((m) => compact(m.getText(sf)))
    .join("; ");
  const more = node.members.length > 6 ? "; …" : "";
  const body = `{ ${members}${more} }`;
  return heritage ? `extends ${heritage} ${body}` : body;
}

function enumSignature(sf: ts.SourceFile, node: ts.EnumDeclaration): string {
  const members = node.members
    .slice(0, 8)
    .map((m) => m.name.getText(sf))
    .join(", ");
  const more = node.members.length > 8 ? ", …" : "";
  return `{ ${members}${more} }`;
}

/** Collapse whitespace so signatures stay one-line in UI/diffs. */
function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
