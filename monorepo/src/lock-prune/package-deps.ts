import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPackageIndex } from "@saflib/imports";
import type {
  CompetingDependencyIssue,
  DepField,
  PackageJsonDeps,
  PlatformContract,
  PlatformOverrideSyncIssue,
  RedundantDependencyIssue,
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

function buildCanonicalRegistrySpecs(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  platform: PlatformContract,
): Map<string, string> {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const canonical = new Map<string, string>();

  for (const [name] of saflibSpecs) {
    if (platform.overrides[name]) {
      canonical.set(name, platform.overrides[name]);
    } else if (platform.resolvedVersions.has(name)) {
      canonical.set(name, platform.resolvedVersions.get(name)!);
    }
  }

  for (const [name, specs] of saflibSpecs) {
    if (canonical.has(name)) continue;
    canonical.set(name, [...specs].sort()[0]!);
  }

  return canonical;
}

function specsMatchForPlatform(
  productSpec: string,
  canonicalSpec: string,
): boolean {
  if (productSpec === canonicalSpec) return true;
  if (productSpec === "*" || productSpec.startsWith("workspace:")) return true;
  return false;
}

function isDeployPackage(packageJsonPath: string, rootDir: string): boolean {
  const rel = path
    .relative(rootDir, packageJsonPath)
    .split(path.sep)
    .join("/");
  return rel === "deploy/package.json" || rel.startsWith("deploy/");
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

export function findCompetingDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  platform: PlatformContract = readPlatformContract(rootDir),
): CompetingDependencyIssue[] {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const canonicalSpecs = buildCanonicalRegistrySpecs(
    rootDir,
    packageIndex,
    platform,
  );
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
      const canonicalSpec = canonicalSpecs.get(name);
      const matchesCanonical =
        !canonicalSpec || specsMatchForPlatform(spec, canonicalSpec);
      if (ownedSpecs.has(spec) && matchesCanonical) continue;
      issues.push({
        kind: "competing-dependency",
        packageJsonPath,
        packageName: pkg.name ?? packageJsonPath,
        field,
        dependency: name,
        productSpec: spec,
        saflibSpecs: [
          ...new Set(
            canonicalSpec ? [canonicalSpec, ...ownedSpecs] : [...ownedSpecs],
          ),
        ].sort(),
      });
    }
  }

  return issues.sort(
    (a, b) =>
      a.dependency.localeCompare(b.dependency) ||
      a.packageJsonPath.localeCompare(b.packageJsonPath),
  );
}

export function findRedundantDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  options: { fixableOnly?: boolean } = {},
): RedundantDependencyIssue[] {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const issues: RedundantDependencyIssue[] = [];

  for (const packageDir of collectProductPackageDirs(rootDir, packageIndex)) {
    const packageJsonPath = path.join(packageDir, "package.json");
    if (options.fixableOnly && isDeployPackage(packageJsonPath, rootDir)) {
      continue;
    }
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps & {
      name?: string;
    };
    for (const { field, name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const ownedSpecs = saflibSpecs.get(name);
      if (!ownedSpecs?.has(spec)) continue;
      issues.push({
        kind: "redundant-dependency",
        packageJsonPath,
        packageName: pkg.name ?? packageJsonPath,
        field,
        dependency: name,
        spec,
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
    } else if (productOverrides[name] !== version) {
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

export function removeDeclaredDependency(
  packageJsonPath: string,
  field: DepField,
  dependency: string,
): void {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps;
  const fieldDeps = pkg[field];
  if (!fieldDeps?.[dependency]) return;
  delete fieldDeps[dependency];
  if (Object.keys(fieldDeps).length === 0) {
    delete pkg[field];
  }
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
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
