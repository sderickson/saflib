export type PackageKind =
  | "app"
  | "http-app"
  | "http"
  | "http-common"
  | "domain"
  | "integration"
  | "db"
  | "spec"
  | "objects"
  | "spa"
  | "vue"
  | "sdk"
  | "sdk-common"
  | "lib"
  | "test"
  | "other";

const PACKAGE_KINDS: readonly PackageKind[] = [
  "app",
  "http-app",
  "http",
  "http-common",
  "domain",
  "integration",
  "db",
  "spec",
  "objects",
  "spa",
  "vue",
  "sdk",
  "sdk-common",
  "lib",
  "test",
  "other",
];

/** Surfaces this kind will eventually show (besides universal Tests). */
export const PACKAGE_KIND_SURFACES: Record<PackageKind, string[]> = {
  app: ["Mounts"],
  "http-app": ["Middleware"],
  http: ["Routes"],
  "http-common": ["Exports"],
  domain: ["Exports"],
  integration: ["Entrypoints"],
  db: ["Schemas / queries"],
  spec: ["Objects / routes"],
  objects: ["Objects"],
  spa: ["Pages"],
  vue: ["Components"],
  sdk: ["Exports"],
  "sdk-common": ["Exports"],
  lib: ["Exports"],
  test: ["Fixtures"],
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
