/**
 * Product package kinds for inventory / layout.
 *
 * Prefer an explicit `package.json` `saf.kind`. Otherwise infer from a unique
 * identifier dependency (`@saflib/drizzle` → db, and so on). Mixing drizzle /
 * express / openapi in one package is a layout error — those layers should
 * stay in separate packages.
 */

export const PACKAGE_KINDS = [
  "db",
  "http",
  "spec",
  "spa",
  "sdk",
  "lib",
  "integration",
  "other",
] as const;

export type PackageKind = (typeof PACKAGE_KINDS)[number];

/** Identifier packages that imply a product layer. The packages themselves are `lib`. */
export const PACKAGE_KIND_IDENTIFIERS = {
  "@saflib/drizzle": "db",
  "@saflib/express": "http",
  "@saflib/openapi": "spec",
  "@saflib/sdk": "sdk",
  "@saflib/vue": "spa",
} as const satisfies Record<string, PackageKind>;

const LAYER_IDENTIFIERS = new Set<string>([
  "@saflib/drizzle",
  "@saflib/express",
  "@saflib/openapi",
]);

export interface SafPackageJson {
  name?: string;
  saf?: { kind?: unknown };
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  exports?: unknown;
}

export interface PackageKindClassification {
  kind: PackageKind;
  /**
   * Layer identifier packages (`drizzle` / `express` / `openapi`) this package
   * depends on when more than one is present.
   */
  mixedIdentifiers: string[];
}

export function isPackageKind(value: unknown): value is PackageKind {
  return (
    typeof value === "string" &&
    (PACKAGE_KINDS as readonly string[]).includes(value)
  );
}

export function parseSafPackageJson(text: string): SafPackageJson | undefined {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as SafPackageJson;
  } catch {
    return undefined;
  }
}

function runtimeDeps(pkg: SafPackageJson): string[] {
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ];
}

function declaredKind(pkg: SafPackageJson): PackageKind | undefined {
  return isPackageKind(pkg.saf?.kind) ? pkg.saf.kind : undefined;
}

/** True when `package.json` `exports` includes a `./requests` subpath. */
export function hasSdkRequestsExport(exportsMap: unknown): boolean {
  if (!exportsMap || typeof exportsMap !== "object" || Array.isArray(exportsMap)) {
    return false;
  }
  return Object.keys(exportsMap).some(
    (key) => key === "./requests" || key.startsWith("./requests/"),
  );
}

/**
 * Classify a package from `saf.kind` and/or identifier dependencies.
 * Does not read the filesystem.
 */
export function classifySafPackage(
  pkg: SafPackageJson,
): PackageKindClassification {
  const declared = declaredKind(pkg);
  if (pkg.name && pkg.name in PACKAGE_KIND_IDENTIFIERS) {
    return { kind: declared ?? "lib", mixedIdentifiers: [] };
  }

  const deps = runtimeDeps(pkg);
  const layerHits = [
    ...new Set(deps.filter((name) => LAYER_IDENTIFIERS.has(name))),
  ].sort();
  const clientHits = [
    ...new Set(
      deps.filter(
        (name) => name === "@saflib/sdk" || name === "@saflib/vue",
      ),
    ),
  ];
  const mixedIdentifiers = layerHits.length > 1 ? layerHits : [];

  if (declared) {
    return { kind: declared, mixedIdentifiers };
  }

  if (layerHits.length === 1) {
    const id = layerHits[0]!;
    return {
      kind: PACKAGE_KIND_IDENTIFIERS[id as keyof typeof PACKAGE_KIND_IDENTIFIERS],
      mixedIdentifiers,
    };
  }
  if (layerHits.length > 1) {
    return { kind: "other", mixedIdentifiers };
  }

  const hasSdk = clientHits.includes("@saflib/sdk");
  const hasVue = clientHits.includes("@saflib/vue");
  if (hasSdk && hasVue) {
    return {
      kind: hasSdkRequestsExport(pkg.exports) ? "sdk" : "spa",
      mixedIdentifiers,
    };
  }
  if (hasSdk) return { kind: "sdk", mixedIdentifiers };
  if (hasVue) return { kind: "spa", mixedIdentifiers };
  return { kind: "other", mixedIdentifiers };
}
