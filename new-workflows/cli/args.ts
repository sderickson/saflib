import type { WorkflowInputSchema } from "@saflib/new-workflows";

/**
 * Turns named CLI flags (`--name=foo`, `--upload`, `--no-verbose`) into a
 * workflow's input object, coercing by the declared `inputSchema` type and
 * filling in defaults. The one generic utility every arg-taking command
 * (`kickoff`, `dry-run`, `run-scripts`) reuses — workflows don't write their
 * own parsers.
 */
export function parseNamedArgs(
  argv: string[],
  schema: WorkflowInputSchema | undefined,
): Record<string, unknown> {
  const properties = schema?.properties ?? {};
  const raw: Record<string, string | boolean> = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      throw new Error(
        `Unexpected positional argument "${arg}" — workflow args must be named (--key=value).`,
      );
    }
    if (arg.startsWith("--no-")) {
      raw[arg.slice("--no-".length)] = false;
      continue;
    }
    const eqIndex = arg.indexOf("=");
    if (eqIndex === -1) {
      raw[arg.slice(2)] = true;
    } else {
      raw[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
    }
  }

  for (const key of Object.keys(raw)) {
    if (!(key in properties)) {
      throw new Error(
        `Unknown argument "--${key}". Expected one of: ${Object.keys(properties).join(", ") || "(none)"}.`,
      );
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    const value = raw[key];
    if (value === undefined) {
      if (prop.default !== undefined) {
        result[key] = prop.default;
      }
      continue;
    }
    result[key] = coerce(key, value, prop.type);
  }

  const missing = (schema?.required ?? []).filter((key) => result[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Missing required argument(s): ${missing.join(", ")}`);
  }

  return result;
}

function coerce(
  key: string,
  value: string | boolean,
  type: "string" | "boolean" | "number",
): string | boolean | number {
  switch (type) {
    case "string":
      if (typeof value !== "string") {
        throw new Error(`--${key} expects a value (e.g. --${key}=foo), got a bare flag.`);
      }
      return value;
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error(`--${key} expects true/false or a bare flag, got "${value}".`);
    case "number": {
      const n = Number(value);
      if (typeof value !== "string" || Number.isNaN(n)) {
        throw new Error(`--${key} expects a number, got "${value}".`);
      }
      return n;
    }
  }
}
