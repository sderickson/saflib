export type PackageKind =
  | "db"
  | "http"
  | "spec"
  | "spa"
  | "sdk"
  | "lib"
  | "integration"
  | "other";

const PACKAGE_KINDS: readonly PackageKind[] = [
  "db",
  "http",
  "spec",
  "spa",
  "sdk",
  "lib",
  "integration",
  "other",
];

/** Surfaces this kind will eventually show (besides universal Tests). */
export const PACKAGE_KIND_SURFACES: Record<PackageKind, string[]> = {
  db: ["Schemas / queries"],
  http: ["Routes"],
  spec: ["Objects / routes"],
  spa: ["Pages"],
  sdk: ["Exports"],
  lib: ["Exports"],
  integration: ["Entrypoints"],
  other: [],
};

/**
 * Coerce an API/package.json kind string. Unknown or missing values are `other`.
 * Server-side classification lives in `@saflib/monorepo` (`saf.kind` / identifier deps).
 */
export function classifyPackageKind(
  kind: string | null | undefined,
): PackageKind {
  if (kind && (PACKAGE_KINDS as readonly string[]).includes(kind)) {
    return kind as PackageKind;
  }
  return "other";
}
