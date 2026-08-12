import ts from "typescript";
import type { TestCaseEntry } from "./types.ts";

const NAME_SEP = " > ";

/**
 * Extract `describe` / `it` / `test` cases from source using the syntactic parser
 * only. Nested `describe` titles are joined onto the leaf title with `" > "`.
 *
 * `it.skip` / `it.only` / `test.skip` / `test.only` / `describe.skip` /
 * `describe.only` **count** — they are still declared tests; skip/only is a
 * runtime concern, not an inventory concern. `*.each` and non-string titles are
 * skipped (no usable stable name).
 */
export function extractTestCases(source: string): TestCaseEntry[] {
  const sf = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const entries: TestCaseEntry[] = [];
  visit(sf, []);
  return entries;

  function visit(node: ts.Node, describeStack: string[]): void {
    const call = asTestFrameworkCall(node);
    if (call) {
      const title = stringArg(call.node.arguments[0]);
      if (call.kind === "describe") {
        const nextStack =
          title !== undefined ? [...describeStack, title] : describeStack;
        // Only walk the describe body so nested describes/its inherit the stack;
        // don't re-walk the whole call (would double-count).
        if (call.node.arguments.length >= 2) {
          visit(call.node.arguments[1], nextStack);
        }
        return;
      }
      // it / test
      if (title !== undefined) {
        entries.push({
          fullName: [...describeStack, title].join(NAME_SEP),
        });
      }
      return;
    }

    ts.forEachChild(node, (child) => visit(child, describeStack));
  }
}

type FrameworkKind = "describe" | "it" | "test";

function asTestFrameworkCall(
  node: ts.Node,
): { kind: FrameworkKind; node: ts.CallExpression } | undefined {
  if (!ts.isCallExpression(node)) return undefined;
  const kind = frameworkCalleeKind(node.expression);
  if (!kind) return undefined;
  return { kind, node };
}

/**
 * Matches `describe` / `it` / `test`, plus `.skip` / `.only` property access
 * (e.g. `it.skip(...)`). Does not match `.each` (parameterized titles aren't
 * stable strings we can inventory).
 */
function frameworkCalleeKind(expr: ts.Expression): FrameworkKind | undefined {
  if (ts.isIdentifier(expr)) {
    return asFrameworkName(expr.text);
  }
  if (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    (expr.name.text === "skip" || expr.name.text === "only")
  ) {
    return asFrameworkName(expr.expression.text);
  }
  return undefined;
}

function asFrameworkName(name: string): FrameworkKind | undefined {
  if (name === "describe" || name === "it" || name === "test") return name;
  return undefined;
}

function stringArg(node: ts.Expression | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}
