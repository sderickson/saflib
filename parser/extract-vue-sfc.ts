import ts from "typescript";
import type { ExportEntry } from "./types.ts";
import { leadingDocstring } from "./jsdoc.ts";

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * True when `source` looks like a Vue SFC (script + template, or `<script setup>`).
 * Used by path-agnostic blob parsing where the filename is not available.
 */
export function isVueSfc(source: string): boolean {
  if (!/<script\b/i.test(source) || !/<\/script>/i.test(source)) return false;
  return /<template\b/i.test(source) || /<script\b[^>]*\bsetup\b/i.test(source);
}

/** Concatenate inner text of every `<script>` block (setup + optional extra). */
export function extractVueScript(source: string): string {
  const parts: string[] = [];
  const re = new RegExp(SCRIPT_RE.source, SCRIPT_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const attrs = m[1] ?? "";
    if (/\bsrc\s*=/.test(attrs)) continue;
    const body = m[2] ?? "";
    if (body.trim()) parts.push(body);
  }
  return parts.join("\n");
}

export interface VueSfcSurface {
  /** Script bodies joined; empty when the SFC has no inline script. */
  script: string;
  props: ExportEntry[];
  emits: ExportEntry[];
  models: ExportEntry[];
}

/**
 * Extract `<script>` text plus `defineProps` / `defineEmits` / `defineModel`
 * members as `prop` / `emit` / `model` export entries (syntactic only).
 */
export function extractVueSfc(source: string): VueSfcSurface {
  const script = extractVueScript(source);
  if (!script.trim()) {
    return { script: "", props: [], emits: [], models: [] };
  }

  const sf = ts.createSourceFile(
    "source.ts",
    script,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const typeDecls = collectTypeDecls(sf);
  const props: ExportEntry[] = [];
  const emits: ExportEntry[] = [];
  const models: ExportEntry[] = [];
  const seenProps = new Set<string>();
  const seenEmits = new Set<string>();
  const seenModels = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const definePropsCall = unwrapNamedCall(node, "defineProps");
      if (definePropsCall) {
        for (const entry of membersFromDefineProps(sf, definePropsCall, typeDecls)) {
          if (seenProps.has(entry.name)) continue;
          seenProps.add(entry.name);
          props.push(entry);
        }
      }
      const defineEmitsCall = unwrapNamedCall(node, "defineEmits");
      if (defineEmitsCall) {
        for (const entry of membersFromDefineEmits(sf, defineEmitsCall, typeDecls)) {
          if (seenEmits.has(entry.name)) continue;
          seenEmits.add(entry.name);
          emits.push(entry);
        }
      }
      const defineModelCall = unwrapNamedCall(node, "defineModel");
      if (defineModelCall) {
        const entry = memberFromDefineModel(sf, defineModelCall);
        if (entry && !seenModels.has(entry.name)) {
          seenModels.add(entry.name);
          models.push(entry);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { script, props, emits, models };
}

function unwrapNamedCall(
  node: ts.CallExpression,
  name: string,
): ts.CallExpression | null {
  if (isNamedCall(node, name)) return node;
  // withDefaults(defineProps<T>(), { ... })
  if (isNamedCall(node, "withDefaults") && node.arguments[0]) {
    const inner = node.arguments[0];
    if (ts.isCallExpression(inner) && isNamedCall(inner, name)) return inner;
  }
  return null;
}

function isNamedCall(node: ts.CallExpression, name: string): boolean {
  return ts.isIdentifier(node.expression) && node.expression.text === name;
}

function collectTypeDecls(
  sf: ts.SourceFile,
): Map<string, ts.TypeNode | ts.InterfaceDeclaration> {
  const decls = new Map<string, ts.TypeNode | ts.InterfaceDeclaration>();
  for (const statement of sf.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      decls.set(statement.name.text, statement);
    } else if (ts.isTypeAliasDeclaration(statement)) {
      decls.set(statement.name.text, statement.type);
    }
  }
  return decls;
}

function resolveTypeArg(
  typeArg: ts.TypeNode,
  decls: Map<string, ts.TypeNode | ts.InterfaceDeclaration>,
): ts.TypeNode | ts.InterfaceDeclaration {
  if (ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName)) {
    const resolved = decls.get(typeArg.typeName.text);
    if (resolved) return resolved;
  }
  return typeArg;
}

function membersFromDefineProps(
  sf: ts.SourceFile,
  call: ts.CallExpression,
  decls: Map<string, ts.TypeNode | ts.InterfaceDeclaration>,
): ExportEntry[] {
  if (call.typeArguments?.[0]) {
    const resolved = resolveTypeArg(call.typeArguments[0], decls);
    return membersFromTypeLiteral(sf, resolved, "prop");
  }
  const arg = call.arguments[0];
  if (arg && ts.isObjectLiteralExpression(arg)) {
    return propsFromRuntimeObject(sf, arg);
  }
  return [];
}

function variableNameForCall(call: ts.CallExpression): string | null {
  let p: ts.Node | undefined = call.parent;
  while (
    p &&
    (ts.isAsExpression(p) ||
      ts.isParenthesizedExpression(p) ||
      ts.isSatisfiesExpression(p) ||
      ts.isNonNullExpression(p))
  ) {
    p = p.parent;
  }
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
    return p.name.text;
  }
  return null;
}

function objectLiteralRequired(init: ts.Expression | undefined): boolean {
  if (!init || !ts.isObjectLiteralExpression(init)) return false;
  const req = init.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) && propertyNameText(p.name) === "required",
  );
  return Boolean(req && req.initializer.kind === ts.SyntaxKind.TrueKeyword);
}

function statementContaining(node: ts.Node): ts.Node {
  let n: ts.Node | undefined = node;
  while (n && n.parent && !ts.isSourceFile(n.parent)) {
    if (ts.isVariableStatement(n) || ts.isExpressionStatement(n)) return n;
    n = n.parent;
  }
  return node;
}

function memberFromDefineModel(
  sf: ts.SourceFile,
  call: ts.CallExpression,
): ExportEntry | null {
  const parts: string[] = [];
  if (call.typeArguments?.[0]) {
    parts.push(compact(call.typeArguments[0].getText(sf)));
  }

  const args = [...call.arguments];
  let modelName: string | null = null;
  if (
    args[0] &&
    (ts.isStringLiteral(args[0]) || ts.isNoSubstitutionTemplateLiteral(args[0]))
  ) {
    modelName = args[0].text;
    args.shift();
  }
  if (objectLiteralRequired(args[0])) parts.push("required");

  if (!modelName) modelName = variableNameForCall(call);
  if (!modelName) modelName = "modelValue";

  return {
    name: modelName,
    kind: "model",
    signature: parts.length ? parts.join(", ") : null,
    docstring: leadingDocstring(sf, statementContaining(call)),
  };
}

function membersFromDefineEmits(
  sf: ts.SourceFile,
  call: ts.CallExpression,
  decls: Map<string, ts.TypeNode | ts.InterfaceDeclaration>,
): ExportEntry[] {
  if (call.typeArguments?.[0]) {
    const resolved = resolveTypeArg(call.typeArguments[0], decls);
    return membersFromTypeLiteral(sf, resolved, "emit");
  }
  const arg = call.arguments[0];
  if (arg && ts.isArrayLiteralExpression(arg)) {
    return emitsFromRuntimeArray(arg);
  }
  if (arg && ts.isObjectLiteralExpression(arg)) {
    return emitsFromRuntimeObject(sf, arg);
  }
  return [];
}

function membersFromTypeLiteral(
  sf: ts.SourceFile,
  node: ts.TypeNode | ts.InterfaceDeclaration,
  kind: "prop" | "emit",
): ExportEntry[] {
  const members: readonly ts.TypeElement[] | undefined = ts.isTypeLiteralNode(
    node,
  )
    ? node.members
    : ts.isInterfaceDeclaration(node)
      ? node.members
      : undefined;
  if (!members) return [];

  const out: ExportEntry[] = [];
  for (const member of members) {
    if (ts.isPropertySignature(member) && member.name) {
      const name = propertyNameText(member.name);
      if (!name) continue;
      out.push({
        name,
        kind,
        signature: member.type ? compact(member.type.getText(sf)) : null,
        docstring: leadingDocstring(sf, member),
      });
      continue;
    }
    if (ts.isCallSignatureDeclaration(member) && kind === "emit") {
      const eventName = emitNameFromCallSignature(sf, member);
      if (!eventName) continue;
      const params = member.parameters
        .slice(1)
        .map((p) => compact(p.getText(sf)))
        .join(", ");
      out.push({
        name: eventName,
        kind,
        signature: params ? `(${params})` : "()",
        docstring: leadingDocstring(sf, member),
      });
    }
  }
  return out;
}

function emitNameFromCallSignature(
  sf: ts.SourceFile,
  member: ts.CallSignatureDeclaration,
): string | null {
  const first = member.parameters[0];
  if (!first?.type) return null;
  if (ts.isLiteralTypeNode(first.type) && ts.isStringLiteral(first.type.literal)) {
    return first.type.literal.text;
  }
  const text = compact(first.type.getText(sf));
  const quoted = /^['"](.+)['"]$/.exec(text);
  return quoted?.[1] ?? null;
}

function propsFromRuntimeObject(
  sf: ts.SourceFile,
  obj: ts.ObjectLiteralExpression,
): ExportEntry[] {
  const out: ExportEntry[] = [];
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) {
      continue;
    }
    const name = propertyNameText(prop.name);
    if (!name) continue;
    let signature: string | null = null;
    if (ts.isPropertyAssignment(prop)) {
      signature = runtimePropSignature(sf, prop.initializer);
    }
    out.push({
      name,
      kind: "prop",
      signature,
      docstring: leadingDocstring(sf, prop),
    });
  }
  return out;
}

function runtimePropSignature(
  sf: ts.SourceFile,
  init: ts.Expression,
): string | null {
  if (ts.isIdentifier(init)) return init.text;
  if (ts.isObjectLiteralExpression(init)) {
    const typeProp = init.properties.find(
      (p): p is ts.PropertyAssignment =>
        ts.isPropertyAssignment(p) && propertyNameText(p.name) === "type",
    );
    const reqProp = init.properties.find(
      (p): p is ts.PropertyAssignment =>
        ts.isPropertyAssignment(p) && propertyNameText(p.name) === "required",
    );
    const parts: string[] = [];
    if (typeProp) parts.push(compact(typeProp.initializer.getText(sf)));
    if (reqProp && reqProp.initializer.kind === ts.SyntaxKind.TrueKeyword) {
      parts.push("required");
    }
    return parts.length ? parts.join(", ") : compact(init.getText(sf));
  }
  return compact(init.getText(sf));
}

function emitsFromRuntimeArray(arr: ts.ArrayLiteralExpression): ExportEntry[] {
  const out: ExportEntry[] = [];
  for (const el of arr.elements) {
    if (ts.isStringLiteral(el) || ts.isNoSubstitutionTemplateLiteral(el)) {
      out.push({ name: el.text, kind: "emit", signature: null, docstring: null });
    }
  }
  return out;
}

function emitsFromRuntimeObject(
  sf: ts.SourceFile,
  obj: ts.ObjectLiteralExpression,
): ExportEntry[] {
  const out: ExportEntry[] = [];
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) && !ts.isMethodDeclaration(prop)) continue;
    const name = propertyNameText(prop.name);
    if (!name) continue;
    out.push({
      name,
      kind: "emit",
      signature: ts.isMethodDeclaration(prop)
        ? compact(
            `(${prop.parameters.map((p) => p.getText(sf)).join(", ")})`,
          )
        : null,
      docstring: leadingDocstring(sf, prop),
    });
  }
  return out;
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  return null;
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
