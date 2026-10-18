import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  resolvePackageRoot,
  type ExternalSchemaProvenance,
} from "./resolve-pkg-refs.ts";

type Schemas = Record<string, unknown>;

const LOCAL_REF = /^#\/components\/schemas\/(.+)$/;

/**
 * The bundler hoists every schema file a spec references into
 * `components.schemas` under the file's name (`profile`, `value`, …). When that
 * file belongs to another package, the same component exists in that package's
 * bundle too. Find those components (same key, same schema, and every schema it
 * references also the same) so their types can be re-exported from the owning
 * package instead of being generated again.
 */
export function findSharedExternalComponents(options: {
  bundledSchemas: Schemas;
  externalSchemas: Map<string, ExternalSchemaProvenance>;
  cwd: string;
}): Map<string, ExternalSchemaProvenance> {
  const { bundledSchemas, externalSchemas, cwd } = options;
  const found = new Map<string, ExternalSchemaProvenance>();
  const ownName = readPackageJson(cwd)?.name;
  const packages = [
    ...new Set([...externalSchemas.values()].map((p) => p.packageName)),
  ].sort();

  for (const packageName of packages) {
    let root: string;
    try {
      root = resolvePackageRoot(packageName, cwd);
    } catch {
      continue;
    }
    // Share only from packages below us. A package that depends on this one
    // (e.g. two specs aliasing each other's schemas) hoists copies of our
    // schemas, and re-exporting in both directions would be circular.
    if (ownName && dependsOn(readPackageJson(root), ownName)) continue;
    const bundlePath = path.join(root, "dist", "openapi.json");
    const stubsDir = path.join(root, "dist", "schemas");
    if (!existsSync(bundlePath) || !existsSync(stubsDir)) continue;
    const theirs = (
      JSON.parse(readFileSync(bundlePath, "utf8")) as {
        components?: { schemas?: Schemas };
      }
    ).components?.schemas;
    if (!theirs) continue;
    const stubByLower = new Map(
      readdirSync(stubsDir).map((name) => [name.toLowerCase(), name]),
    );

    const memo = new Map<string, boolean>();
    for (const key of Object.keys(bundledSchemas).sort()) {
      if (externalSchemas.has(key) || found.has(key)) continue;
      if (!(key in theirs)) continue;
      if (!sameComponent(key, key, bundledSchemas, theirs, memo, new Set())) {
        continue;
      }
      const stub = stubByLower.get(key.toLowerCase());
      if (!stub) continue;
      // Only the package that defines the schema owns it. A package that itself
      // re-exports it from elsewhere (e.g. one spec aliasing another's
      // schemas) would create circular re-exports between packages.
      if (!definesSchemaLocally(path.join(stubsDir, stub))) continue;
      found.set(key, { packageName, schemaName: stub });
    }
  }
  return found;
}

/** Follow components that are only `{ $ref: "#/components/schemas/x" }`. */
function resolveAlias(name: string, schemas: Schemas): string {
  const seen = new Set<string>();
  let current = name;
  while (!seen.has(current)) {
    seen.add(current);
    const value = schemas[current] as { $ref?: unknown } | undefined;
    if (
      !value ||
      typeof value !== "object" ||
      Object.keys(value).length !== 1
    ) {
      break;
    }
    const m =
      typeof value.$ref === "string" ? LOCAL_REF.exec(value.$ref) : null;
    if (!m) break;
    current = m[1]!;
  }
  return current;
}

/**
 * Whether component `a` in our bundle and `b` in theirs describe the same
 * schema. Bundles may name the same schema differently (a hoisted `country-code`
 * vs a named `CountryCode`), so references are compared by what they point at.
 */
function sameComponent(
  a: string,
  b: string,
  ours: Schemas,
  theirs: Schemas,
  memo: Map<string, boolean>,
  inProgress: Set<string>,
): boolean {
  const ra = resolveAlias(a, ours);
  const rb = resolveAlias(b, theirs);
  const key = `${ra}\u0000${rb}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  if (inProgress.has(key)) return true; // cycle: decided by the outer call
  if (!(ra in ours) || !(rb in theirs)) return false;
  inProgress.add(key);
  const result = sameValue(
    ours[ra],
    theirs[rb],
    ours,
    theirs,
    memo,
    inProgress,
  );
  inProgress.delete(key);
  memo.set(key, result);
  return result;
}

function sameValue(
  a: unknown,
  b: unknown,
  ours: Schemas,
  theirs: Schemas,
  memo: Map<string, boolean>,
  inProgress: Set<string>,
): boolean {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return (
      a.length === bb.length &&
      a.every((item, i) =>
        sameValue(item, bb[i], ours, theirs, memo, inProgress),
      )
    );
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = Object.keys(ao);
  if (keys.length !== Object.keys(bo).length) return false;
  for (const key of keys) {
    if (!(key in bo)) return false;
    const av = ao[key];
    const bv = bo[key];
    if (key === "$ref" && typeof av === "string" && typeof bv === "string") {
      const ma = LOCAL_REF.exec(av);
      const mb = LOCAL_REF.exec(bv);
      if (ma && mb) {
        if (!sameComponent(ma[1]!, mb[1]!, ours, theirs, memo, inProgress)) {
          return false;
        }
        continue;
      }
      if (av !== bv) return false;
      continue;
    }
    if (!sameValue(av, bv, ours, theirs, memo, inProgress)) return false;
  }
  return true;
}

/** True when a generated `schemas/<name>/index.ts` stub defines the type itself. */
function definesSchemaLocally(stubDir: string): boolean {
  const indexPath = path.join(stubDir, "index.ts");
  if (!existsSync(indexPath)) return false;
  return !/^export type \{/m.test(readFileSync(indexPath, "utf8"));
}

type PackageJsonDeps = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

function readPackageJson(dir: string): PackageJsonDeps | undefined {
  try {
    return JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf8"),
    ) as PackageJsonDeps;
  } catch {
    return undefined;
  }
}

function dependsOn(pj: PackageJsonDeps | undefined, name: string): boolean {
  if (!pj) return false;
  return [pj.dependencies, pj.devDependencies, pj.peerDependencies].some(
    (deps) => deps !== undefined && name in deps,
  );
}
