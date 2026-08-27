/**
 * Derive package-local `#` import maps from `exports`.
 * Extensions stay in the import specifier (`#foo.ts`), so targets are extension-preserving
 * (`./*` not `./*.ts`).
 */
export function importGlobForTopLevelSegment(segment: string): {
  key: string;
  value: string;
} {
  return {
    key: `#${segment}/*`,
    value: `./${segment}/*`,
  };
}

/** Catch-all for package-root files: `#context.ts` → `./context.ts`. */
export const ROOT_IMPORT_CATCHALL = {
  key: "#*",
  value: "./*",
} as const;

/** Remove template placeholder import keys/values (e.g. `#__group-name__/*`). */
export function stripTemplateImportPlaceholders(
  imports: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!imports) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(imports)) {
    if (key.includes("__") || String(value).includes("__")) continue;
    out[key] = value;
  }
  return out;
}

export function upsertImportGlob(
  imports: Record<string, unknown>,
  topLevelSegment: string,
): Record<string, unknown> {
  const { key, value } = importGlobForTopLevelSegment(topLevelSegment);
  if (imports[key] === value) return imports;
  return { ...imports, [key]: value };
}

/**
 * Build a default `imports` map from an `exports` map:
 * - `./*` → `./*.ts` becomes `#*` → `./*`
 * - `./dir/*` → `./dir/*.ts` becomes `#dir/*` → `./dir/*`
 * - `./dir/*` → `./dir/*` becomes `#dir/*` → `./dir/*`
 * Explicit leaf exports are covered by `#*`.
 */
export function importsFromExports(
  exports: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const imports: Record<string, unknown> = {
    [ROOT_IMPORT_CATCHALL.key]: ROOT_IMPORT_CATCHALL.value,
  };
  if (!exports) return imports;

  for (const [key, value] of Object.entries(exports)) {
    if (typeof value !== "string") continue;
    if (key.includes("__") || value.includes("__")) continue;

    // `./dir/*` → `./dir/*` or `./dir/*.ts` (skip remaps like `./dist/dir/*/index.ts`)
    const dirMatch = key.match(/^\.\/([^/]+)\/\*$/);
    if (dirMatch) {
      const segment = dirMatch[1];
      if (
        value === `./${segment}/*` ||
        value === `./${segment}/*.ts` ||
        value.startsWith(`./${segment}/`)
      ) {
        imports[`#${segment}/*`] = `./${segment}/*`;
      }
      continue;
    }

    // `./*` → `./*.ts` / `./*`, or remapped (e.g. `./emails/*.ts`)
    if (key === "./*") {
      const remapped = value.match(/^\.\/([^*/]+)\/\*(?:\.ts)?$/);
      if (remapped) {
        imports[ROOT_IMPORT_CATCHALL.key] = `./${remapped[1]}/*`;
      } else {
        imports[ROOT_IMPORT_CATCHALL.key] = ROOT_IMPORT_CATCHALL.value;
      }
      continue;
    }

    // Explicit index barrel: `./clients` → `./clients/index.ts`
    if (
      !key.includes("*") &&
      key.startsWith("./") &&
      value.endsWith("/index.ts")
    ) {
      const name = key.slice(2);
      imports[`#${name}`] = value;
    }
  }

  return imports;
}
