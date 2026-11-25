import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * What to log about a caught error: its name, code and message (the message
 * still goes through the log redactor). Not the error object itself, which
 * serializes everything attached to it: a database error's statement
 * parameters, an HTTP client error's request headers.
 */
export function errorLogFields(err: unknown): Record<string, string> {
  if (!(err instanceof Error)) return { error_name: typeof err, error_message: String(err) };
  const code = (err as { code?: unknown }).code;
  return {
    error_name: err.name,
    ...(typeof code === "string" || typeof code === "number" ? { error_code: String(code) } : {}),
    error_message: err.message,
  };
}

export interface LogHygieneViolation {
  file: string;
  line: number;
  rule: "error-object-field" | "error-interpolation";
  text: string;
}

const LOG_CALL = /\blog\.(?:debug|info|warn|error)\(/g;
const ERROR_NAME = "(?:err|error|e|caught|cause)";
/** `{ err }`, `{ ..., error }`, `{ err: e }`, `{ error: err }` */
const ERROR_FIELD = new RegExp(
  `[{,]\\s*(?:${ERROR_NAME}\\s*[,}]|\\w+\\s*:\\s*${ERROR_NAME}\\s*[,}])`,
);
/** `${err}` in the message */
const ERROR_INTERPOLATION = new RegExp(`\\$\\{\\s*${ERROR_NAME}\\s*\\}`);
const ALLOW = "log-hygiene-ok";

/** The text of a call's arguments, from just after `(` to its matching `)`. */
function callArgs(source: string, from: number): string {
  let depth = 1;
  let i = from;
  while (i < source.length && depth > 0) {
    const c = source[i]!;
    if (c === "(") depth++;
    else if (c === ")") depth--;
    i++;
  }
  return source.slice(from, i - 1);
}

/** Violations in one file's source. A line containing `log-hygiene-ok` is exempt. */
export function findLogHygieneViolations(source: string, file = "<source>"): LogHygieneViolation[] {
  const violations: LogHygieneViolation[] = [];
  for (const match of source.matchAll(LOG_CALL)) {
    const start = match.index!;
    const args = callArgs(source, start + match[0].length);
    const line = source.slice(0, start).split("\n").length;
    const lines = source.split("\n");
    const callLines = lines.slice(line - 1, line + args.split("\n").length);
    if (callLines.some((l) => l.includes(ALLOW)) || lines[line - 2]?.includes(ALLOW)) continue;
    const text = lines[line - 1]!.trim();
    if (ERROR_INTERPOLATION.test(args)) violations.push({ file, line, rule: "error-interpolation", text });
    // Template placeholders aside, so `${error}` isn't read as a `{ error }` field.
    else if (ERROR_FIELD.test(args.replace(/\$\{[^}]*\}/g, ""))) {
      violations.push({ file, line, rule: "error-object-field", text });
    }
  }
  return violations;
}

const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".git", "cache"]);

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (/\.ts$/.test(name) && !/\.(test|spec|d)\.ts$/.test(name)) yield full;
  }
}

/**
 * Fails, listing every violation, when a log call under `rootDir` logs a whole
 * error object or interpolates one into its message. Use
 * {@link errorLogFields} instead, or mark a reviewed line `// log-hygiene-ok`.
 */
export function assertLogHygiene(rootDir: string, options: { ignore?: RegExp } = {}): void {
  const violations: LogHygieneViolation[] = [];
  for (const file of sourceFiles(rootDir)) {
    const rel = path.relative(rootDir, file);
    if (options.ignore?.test(rel)) continue;
    violations.push(...findLogHygieneViolations(readFileSync(file, "utf8"), rel));
  }
  if (violations.length > 0) {
    throw new Error(
      `Log calls that log whole error objects (use errorLogFields(err) from @saflib/node, or mark a reviewed line // log-hygiene-ok):\n` +
        violations.map((v) => `  ${v.file}:${v.line} [${v.rule}] ${v.text}`).join("\n"),
    );
  }
}
