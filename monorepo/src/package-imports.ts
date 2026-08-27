/**
 * Derive package-local `#` import maps from `exports`.
 *
 * Extensions stay in the import specifier (`#foo.ts`), so targets are
 * extension-preserving (`./*` not `./*.ts`).
 *
 * Convention:
 * - If `exports` has `./*`, use only `#*` (covers root + nested). Do not also
 *   list thematic folder globs — they are redundant.
 * - Otherwise list thematic `#dir/*` globs, root files (`#i18n.ts`), and
 *   barrels (`#clients` → `./clients/index.ts`) so the map documents what is
 *   importable from nested files.
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

/** Catch-all only when `exports` includes `./*`. */
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

function isSameTreeGlob(segment: string, value: string): boolean {
  return (
    value === `./${segment}/*` ||
    value === `./${segment}/*.ts` ||
    value.startsWith(`./${segment}/`)
  );
}

/**
 * Build a default `imports` map from an `exports` map.
 */
export function importsFromExports(
  exports: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const imports: Record<string, unknown> = {};
  if (!exports) return imports;

  const hasRootGlob = Object.entries(exports).some(
    ([key, value]) =>
      key === "./*" && typeof value === "string" && !value.includes("__"),
  );

  if (hasRootGlob) {
    const rootValue = exports["./*"];
    if (typeof rootValue === "string") {
      const remapped = rootValue.match(/^\.\/([^*/]+)\/\*(?:\.ts)?$/);
      imports[ROOT_IMPORT_CATCHALL.key] = remapped
        ? `./${remapped[1]}/*`
        : ROOT_IMPORT_CATCHALL.value;
    }

    // Keep explicit barrels that remaps (e.g. `#matter-pipeline` → index).
    for (const [key, value] of Object.entries(exports)) {
      if (typeof value !== "string") continue;
      if (key.includes("__") || value.includes("__")) continue;
      if (
        !key.includes("*") &&
        key.startsWith("./") &&
        !key.slice(2).includes("/") &&
        value.endsWith("/index.ts")
      ) {
        imports[`#${key.slice(2)}`] = value;
      }
    }
    return imports;
  }

  for (const [key, value] of Object.entries(exports)) {
    if (typeof value !== "string") continue;
    if (key.includes("__") || value.includes("__")) continue;

    // `./dir/*` → `#dir/*` (skip dist remaps)
    const dirMatch = key.match(/^\.\/([^/]+)\/\*$/);
    if (dirMatch) {
      const segment = dirMatch[1];
      if (isSameTreeGlob(segment, value)) {
        imports[`#${segment}/*`] = `./${segment}/*`;
      }
      continue;
    }

    if (key.includes("*") || !key.startsWith("./")) continue;

    const subpath = key.slice(2);

    // Nested leaf export (`./testing/slim-route-test`) → thematic `#testing/*`
    if (subpath.includes("/")) {
      const segment = subpath.split("/")[0]!;
      if (isSameTreeGlob(segment, value) || value.startsWith(`./${segment}/`)) {
        imports[`#${segment}/*`] = `./${segment}/*`;
      }
      continue;
    }

    // Barrel: `./clients` → `./clients/index.ts`
    if (value.endsWith("/index.ts")) {
      imports[`#${subpath}`] = value;
      continue;
    }

    // Folder entry remap: `./instances` → `./instances/registry.ts`
    if (value.startsWith(`./${subpath}/`)) {
      imports[`#${subpath}`] = value;
      imports[`#${subpath}/*`] = `./${subpath}/*`;
      continue;
    }

    // Root file: `./i18n` → `./i18n.ts` becomes `#i18n.ts`
    const rootFile = value.match(/^\.\/([^/]+\.tsx?)$/);
    if (rootFile) {
      imports[`#${rootFile[1]}`] = value;
    }
  }

  return imports;
}
