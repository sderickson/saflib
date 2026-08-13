import ts from "typescript";
import type { DrizzleTableColumn, DrizzleTableEntry } from "./types.ts";
import { leadingDocstring } from "./jsdoc.ts";

const TABLE_CALLEES = new Set(["sqliteTable", "pgTable", "mysqlTable"]);

/**
 * Extract drizzle `sqliteTable` / `pgTable` / `mysqlTable` definitions from
 * TypeScript source using the syntactic parser only (no type-checker).
 *
 * Column JSDoc prefers the property assignment; when absent, falls back to a
 * matching property on an `*Entity` interface in the same file (common pattern
 * in this monorepo).
 */
export function extractDrizzleTables(source: string): DrizzleTableEntry[] {
  const sf = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const entityDocs = entityPropertyDocstrings(sf);
  const entries: DrizzleTableEntry[] = [];

  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const tableDocstring = leadingDocstring(sf, statement);
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const table = tableFromCall(sf, decl.initializer, entityDocs);
      if (!table) continue;
      entries.push({
        exportName: decl.name.text,
        tableName: table.tableName,
        docstring: tableDocstring,
        columns: table.columns,
      });
    }
  }

  return entries;
}

/**
 * Map property name → docstring from interfaces whose names end with `Entity`.
 * Later interfaces win on duplicate property names.
 */
function entityPropertyDocstrings(sf: ts.SourceFile): Map<string, string> {
  const docs = new Map<string, string>();
  for (const statement of sf.statements) {
    if (!ts.isInterfaceDeclaration(statement)) continue;
    if (!statement.name.text.endsWith("Entity")) continue;
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const name = propertyNameText(member.name);
      if (!name) continue;
      const doc = leadingDocstring(sf, member);
      if (doc) docs.set(name, doc);
    }
  }
  return docs;
}

function tableFromCall(
  sf: ts.SourceFile,
  expr: ts.Expression,
  entityDocs: Map<string, string>,
): { tableName: string; columns: DrizzleTableColumn[] } | null {
  if (!ts.isCallExpression(expr)) return null;
  const callee = expr.expression;
  const calleeName = ts.isIdentifier(callee)
    ? callee.text
    : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)
      ? callee.name.text
      : null;
  if (!calleeName || !TABLE_CALLEES.has(calleeName)) return null;
  if (expr.arguments.length < 2) return null;

  const nameArg = expr.arguments[0]!;
  if (!ts.isStringLiteral(nameArg) && !ts.isNoSubstitutionTemplateLiteral(nameArg)) {
    return null;
  }
  const tableName = nameArg.text;

  const colsArg = expr.arguments[1]!;
  if (!ts.isObjectLiteralExpression(colsArg)) return null;

  const columns: DrizzleTableColumn[] = [];
  for (const prop of colsArg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const propName = propertyNameText(prop.name);
    if (!propName) continue;
    const col = columnFromInitializer(sf, propName, prop.initializer);
    if (!col) continue;
    const docstring =
      leadingDocstring(sf, prop) ??
      entityDocs.get(propName) ??
      entityDocs.get(col.sqlName) ??
      null;
    columns.push({ ...col, docstring });
  }

  return { tableName, columns };
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  return null;
}

function columnFromInitializer(
  _sf: ts.SourceFile,
  propName: string,
  init: ts.Expression,
): Omit<DrizzleTableColumn, "docstring"> | null {
  const call = outermostColumnCall(init);
  if (!call) return null;
  const callee = call.expression;
  const typeKind = ts.isIdentifier(callee)
    ? callee.text
    : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)
      ? callee.name.text
      : null;
  if (!typeKind) return null;

  let sqlName = propName;
  const first = call.arguments[0];
  if (
    first &&
    (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))
  ) {
    sqlName = first.text;
  }

  return { propName, sqlName, typeKind };
}

/**
 * Walk through `.notNull()`, `.primaryKey()`, `.references(...)`, etc. to the
 * root column builder call (`text(...)`, `integer(...)`, …).
 */
function outermostColumnCall(expr: ts.Expression): ts.CallExpression | null {
  let cur: ts.Expression = expr;
  for (;;) {
    if (ts.isCallExpression(cur)) {
      if (ts.isPropertyAccessExpression(cur.expression)) {
        // something.notNull() / .references(() => ...)
        cur = cur.expression.expression;
        continue;
      }
      return cur;
    }
    if (ts.isPropertyAccessExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    return null;
  }
}
