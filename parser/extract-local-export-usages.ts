import ts from "typescript";
import { extractExports } from "./extract-exports.ts";

/**
 * Export names that are referenced as **values** elsewhere in the same file
 * (beyond their declaration). Used so same-file helpers aren't false `dead-code`
 * — they become `same-file-only-export` via a self `usedBy` edge.
 *
 * Skips: binding declaration names, export-clause names, property/method names,
 * and identifiers in type positions.
 */
export function extractLocalExportUsages(source: string): string[] {
  const exportNames = new Set(extractExports(source).map((e) => e.name));
  if (exportNames.size === 0) return [];

  const sf = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const used = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && exportNames.has(node.text)) {
      if (
        !isBindingNameIdentifier(node) &&
        !isExportClauseName(node) &&
        !isPropertyNameIdentifier(node) &&
        !isInTypePosition(node)
      ) {
        used.add(node.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return [...used].sort();
}

/** Identifier that introduces a binding (`function foo`, `const foo`, …). */
function isBindingNameIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (
    (ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isEnumDeclaration(parent) ||
      ts.isModuleDeclaration(parent)) &&
    parent.name === node
  ) {
    return true;
  }
  if (ts.isVariableDeclaration(parent) && parent.name === node) return true;
  if (ts.isBindingElement(parent) && parent.name === node) return true;
  if (ts.isParameter(parent) && parent.name === node) return true;
  return false;
}

/** `export { foo }` / `export { foo as bar }` clause identifiers. */
function isExportClauseName(node: ts.Identifier): boolean {
  const parent = node.parent;
  return !!parent && ts.isExportSpecifier(parent);
}

/** `obj.foo` / `{ foo: 1 }` / class method name — not a binding reference. */
function isPropertyNameIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  // Shorthand `{ foo }` is a value reference to `foo` — count it.
  if (ts.isMethodDeclaration(parent) && parent.name === node) return true;
  if (ts.isGetAccessorDeclaration(parent) && parent.name === node) return true;
  if (ts.isSetAccessorDeclaration(parent) && parent.name === node) return true;
  if (ts.isPropertyDeclaration(parent) && parent.name === node) return true;
  if (ts.isEnumMember(parent) && parent.name === node) return true;
  return false;
}

function isInTypePosition(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isTypeNode(cur) || ts.isTypeParameterDeclaration(cur)) return true;
    if (
      ts.isExpressionStatement(cur) ||
      ts.isBlock(cur) ||
      ts.isSourceFile(cur) ||
      ts.isFunctionLike(cur) ||
      ts.isClassDeclaration(cur) ||
      ts.isVariableDeclaration(cur)
    ) {
      break;
    }
    cur = cur.parent;
  }
  return false;
}
