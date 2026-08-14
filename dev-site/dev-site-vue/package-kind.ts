export type PackageKind =
  | "db"
  | "http"
  | "spec"
  | "spa"
  | "sdk"
  | "lib"
  | "integration"
  | "other";

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
 * Heuristic package kind from npm name + directory (refine later).
 */
export function classifyPackageKind(
  packageName: string,
  directory: string = "",
): PackageKind {
  const name = packageName.toLowerCase();
  const dir = directory.replace(/\\/g, "/").toLowerCase();

  if (dir.includes("/integrations/") || dir.includes("service/integrations")) {
    return "integration";
  }
  if (name.endsWith("-db") || name.includes("-db-") || /\/[^/]*-db$/.test(dir)) {
    return "db";
  }
  if (
    name.endsWith("-http") ||
    name.includes("-http-") ||
    /\/[^/]*-http$/.test(dir)
  ) {
    return "http";
  }
  if (
    name.endsWith("-spec") ||
    name.includes("-spec-") ||
    /\/[^/]*-spec$/.test(dir)
  ) {
    return "spec";
  }
  if (
    name.endsWith("-vue") ||
    name.endsWith("-spa") ||
    dir.includes("/clients/") ||
    dir.includes("clients/")
  ) {
    return "spa";
  }
  if (name.endsWith("-sdk") || name.includes("-sdk-")) {
    return "sdk";
  }
  if (
    name.startsWith("@saflib/") &&
    !name.includes("-db") &&
    !name.includes("-http") &&
    !name.includes("-spec") &&
    !name.includes("-vue") &&
    !name.includes("-sdk")
  ) {
    // Shared primitives: git, parser, express utils, etc.
    if (
      ["git", "parser", "utils", "node", "env", "drizzle", "openapi"].some(
        (s) => name === `@saflib/${s}` || name.endsWith(`/${s}`),
      )
    ) {
      return "lib";
    }
  }
  if (
    name.includes("/git") ||
    name.endsWith("/parser") ||
    name.endsWith("/utils")
  ) {
    return "lib";
  }

  return "other";
}
