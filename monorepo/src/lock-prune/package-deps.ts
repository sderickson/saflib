import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPackageIndex } from "@saflib/imports";
import type {
  CompetingDependencyIssue,
  DepField,
  PackageJsonDeps,
  PlatformContract,
  PlatformOverrideSyncIssue,
} from "./types.ts";
import { DEP_FIELDS } from "./types.ts";
import { readPlatformContract } from "./platform.ts";

function isSaflibPackageDir(rootDir: string, packageDir: string): boolean {
  const saflibRoot = path.resolve(rootDir, "saflib");
  const resolvedPackageDir = path.resolve(packageDir);
  const rel = path
    .relative(saflibRoot, resolvedPackageDir)
    .split(path.sep)
    .join("/");
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function isProductOwnedDependencyName(name: string, spec: string): boolean {
  if (name.startsWith("@saflib/")) return true;
  if (spec === "*") return true;
  if (spec.startsWith("workspace:")) return true;
  if (spec.startsWith("file:")) return true;
  return false;
}

function collectDependencySpecs(
  pkg: PackageJsonDeps,
): Array<{ field: DepField; name: string; spec: string }> {
  const out: Array<{ field: DepField; name: string; spec: string }> = [];
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      out.push({ field, name, spec });
    }
  }
  return out;
}

function buildSaflibSpecs(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
): Map<string, Set<string>> {
  const saflibSpecs = new Map<string, Set<string>>();

  for (const [, info] of packageIndex) {
    if (!isSaflibPackageDir(rootDir, info.dir)) continue;
    const pkg = JSON.parse(
      readFileSync(path.join(info.dir, "package.json"), "utf8"),
    ) as PackageJsonDeps;
    for (const { name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const specs = saflibSpecs.get(name) ?? new Set<string>();
      specs.add(spec);
      saflibSpecs.set(name, specs);
    }
  }

  return saflibSpecs;
}

type Version = [number, number, number];

function parseVersion(text: string): Version | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(text.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}

function compareVersions(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Whether `version` satisfies `spec`, for the spec forms products commonly
 * use (exact, `^`, `~`, `>=`, `*`). Undefined when the spec is anything else,
 * so callers can stay quiet rather than guess.
 */
function specIncludes(spec: string, version: Version): boolean | undefined {
  const trimmed = spec.trim();
  if (trimmed === "*" || trimmed === "" || trimmed === "latest") return true;
  const operator = /^(\^|~|>=)?/.exec(trimmed)![0];
  const base = parseVersion(trimmed.slice(operator.length));
  if (!base) return undefined;
  const cmp = compareVersions(version, base);
  if (operator === "") return cmp === 0;
  if (cmp < 0) return false;
  if (operator === ">=") return true;
  if (operator === "~") return version[0] === base[0] && version[1] === base[1];
  // ^: same leftmost non-zero component.
  if (base[0] !== 0) return version[0] === base[0];
  if (base[1] !== 0) return version[0] === 0 && version[1] === base[1];
  return version[0] === 0 && version[1] === 0 && version[2] === base[2];
}

function specBase(spec: string): Version | undefined {
  return parseVersion(spec.trim().replace(/^(\^|~|>=)/, ""));
}

/**
 * Whether two specs can share a version, judged by whether either includes
 * the other's base version. Undefined when either can't be judged.
 */
function specsOverlap(a: string, b: string): boolean | undefined {
  const baseA = specBase(a);
  const baseB = specBase(b);
  if (!baseA || !baseB) return undefined;
  const aIncludesB = specIncludes(a, baseB);
  const bIncludesA = specIncludes(b, baseA);
  if (aIncludesB === undefined || bIncludesA === undefined) return undefined;
  return aIncludesB || bIncludesA;
}

/** The version saflib installs: its exact override pin, else its lockfile's. */
function platformVersion(
  name: string,
  platform: PlatformContract,
): string | undefined {
  const override = platform.overrides[name];
  if (typeof override === "string" && parseVersion(override)) return override;
  return platform.resolvedVersions.get(name);
}

function collectProductPackageDirs(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
): string[] {
  const dirs = new Set<string>([path.resolve(rootDir)]);
  for (const [, info] of packageIndex) {
    if (isSaflibPackageDir(rootDir, info.dir)) continue;
    dirs.add(path.resolve(info.dir));
  }
  return [...dirs];
}

/**
 * Product dependencies whose range can't include the version saflib installs,
 * so npm would need a second copy. Ranges that overlap are fine: products
 * declare what they import.
 */
export function findCompetingDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  platform: PlatformContract = readPlatformContract(rootDir),
): CompetingDependencyIssue[] {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const issues: CompetingDependencyIssue[] = [];

  for (const packageDir of collectProductPackageDirs(rootDir, packageIndex)) {
    const packageJsonPath = path.join(packageDir, "package.json");
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps & {
      name?: string;
    };
    for (const { field, name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const ownedSpecs = saflibSpecs.get(name);
      if (!ownedSpecs) continue;
      const installed = platformVersion(name, platform);
      const parsed = installed ? parseVersion(installed) : undefined;
      // Without a saflib lockfile entry, compare against saflib's ranges.
      const competes = parsed
        ? specIncludes(spec, parsed) === false
        : [...ownedSpecs].every((owned) => specsOverlap(spec, owned) === false);
      if (!competes) continue;
      issues.push({
        kind: "competing-dependency",
        packageJsonPath,
        packageName: pkg.name ?? packageJsonPath,
        field,
        dependency: name,
        productSpec: spec,
        saflibSpecs: installed ? [installed] : [...ownedSpecs].sort(),
      });
    }
  }

  return issues.sort(
    (a, b) =>
      a.dependency.localeCompare(b.dependency) ||
      a.packageJsonPath.localeCompare(b.packageJsonPath),
  );
}

export function findPlatformOverrideDrift(
  rootDir: string,
  platform: PlatformContract,
): PlatformOverrideSyncIssue | null {
  const productPkgPath = path.join(rootDir, "package.json");
  const productPkg = JSON.parse(readFileSync(productPkgPath, "utf8")) as {
    overrides?: Record<string, string>;
  };
  const productOverrides = productPkg.overrides ?? {};
  const missing: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};

  for (const [name, version] of Object.entries(platform.overrides)) {
    if (productOverrides[name] === undefined) {
      missing[name] = version;
    } else if (
      JSON.stringify(productOverrides[name]) !== JSON.stringify(version)
    ) {
      changed[name] = { from: productOverrides[name], to: version };
    }
  }

  if (Object.keys(missing).length === 0 && Object.keys(changed).length === 0) {
    return null;
  }

  return { kind: "platform-override-sync", missing, changed };
}

export function syncPlatformOverrides(
  rootDir: string,
  platform: PlatformContract,
): string[] {
  const productPkgPath = path.join(rootDir, "package.json");
  const productPkg = JSON.parse(readFileSync(productPkgPath, "utf8")) as {
    overrides?: Record<string, string>;
  };
  const nextOverrides = { ...(productPkg.overrides ?? {}) };
  const applied: string[] = [];

  for (const [name, version] of Object.entries(platform.overrides)) {
    if (nextOverrides[name] === version) continue;
    nextOverrides[name] = version;
    applied.push(`${name}@${version}`);
  }

  if (applied.length === 0) return applied;

  productPkg.overrides = nextOverrides;
  writeFileSync(productPkgPath, `${JSON.stringify(productPkg, null, 2)}\n`);
  return applied;
}

export function listInstalledPackageNames(nodeModulesDir: string): Set<string> {
  const names = new Set<string>();
  if (!existsSync(nodeModulesDir)) return names;

  for (const entry of readdirSync(nodeModulesDir)) {
    if (entry.startsWith(".")) continue;
    const entryPath = path.join(nodeModulesDir, entry);
    if (entry.startsWith("@")) {
      let scopedEntries: string[];
      try {
        scopedEntries = readdirSync(entryPath);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        if (existsSync(path.join(entryPath, scopedEntry, "package.json"))) {
          names.add(`${entry}/${scopedEntry}`);
        }
      }
      continue;
    }
    if (existsSync(path.join(entryPath, "package.json"))) {
      names.add(entry);
    }
  }

  return names;
}

export function listPackageDirectories(nodeModulesDir: string): string[] {
  const dirs: string[] = [];
  if (!existsSync(nodeModulesDir)) return dirs;

  for (const entry of readdirSync(nodeModulesDir)) {
    if (entry.startsWith(".")) continue;
    const entryPath = path.join(nodeModulesDir, entry);
    if (entry.startsWith("@")) {
      let scopedEntries: string[];
      try {
        scopedEntries = readdirSync(entryPath);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        const pkgDir = path.join(entryPath, scopedEntry);
        if (existsSync(path.join(pkgDir, "package.json"))) {
          dirs.push(pkgDir);
        }
      }
      continue;
    }
    if (existsSync(path.join(entryPath, "package.json"))) {
      dirs.push(entryPath);
    }
  }

  return dirs;
}
