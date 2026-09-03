import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { buildPackageIndex, findMonorepoRoot } from "@saflib/imports";

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

const SAFLIB_NODE_MODULES_IGNORE = new Set([
  ".cache",
  ".tmp",
  ".vite-temp",
]);

type DepField = (typeof DEP_FIELDS)[number];

interface PackageJsonDeps {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface LockPackageEntry {
  version?: string;
  resolved?: string;
  link?: boolean;
}

interface PackageLock {
  packages?: Record<string, LockPackageEntry | undefined>;
}

export interface SaflibNodeModulesIssue {
  kind: "saflib-node-modules";
  path: string;
  packages: string[];
}

export interface CompetingDependencyIssue {
  kind: "competing-dependency";
  packageJsonPath: string;
  packageName: string;
  field: DepField;
  dependency: string;
  productSpec: string;
  saflibSpecs: string[];
}

export interface StaleLockfileIssue {
  kind: "stale-lockfile";
  lockfilePath: string;
  stalePaths: string[];
  removedCount: number;
}

export type LockPruneIssue =
  | SaflibNodeModulesIssue
  | CompetingDependencyIssue
  | StaleLockfileIssue;

export interface RedundantDependencyWarning {
  packageJsonPath: string;
  packageName: string;
  field: DepField;
  dependency: string;
  spec: string;
}

export interface LockPruneAnalysis {
  rootDir: string;
  saflibDir: string;
  issues: LockPruneIssue[];
  warnings: RedundantDependencyWarning[];
}

export interface LockPruneOptions {
  rootDir?: string;
  yes?: boolean;
  confirm?: (message: string) => Promise<boolean>;
}

function isWorkspaceLockEntry(key: string): boolean {
  return key !== "" && !key.includes("node_modules/");
}

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

export function inspectSaflibNodeModules(
  saflibDir: string,
): SaflibNodeModulesIssue | null {
  const nodeModulesPath = path.join(saflibDir, "node_modules");
  if (!existsSync(nodeModulesPath)) return null;

  const packages: string[] = [];
  for (const entry of readdirSync(nodeModulesPath)) {
    if (entry.startsWith(".") || SAFLIB_NODE_MODULES_IGNORE.has(entry)) {
      continue;
    }
    const entryPath = path.join(nodeModulesPath, entry);
    if (entry.startsWith("@")) {
      let scopedEntries: string[];
      try {
        scopedEntries = readdirSync(entryPath);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        if (existsSync(path.join(entryPath, scopedEntry, "package.json"))) {
          packages.push(`${entry}/${scopedEntry}`);
        }
      }
      continue;
    }
    if (existsSync(path.join(entryPath, "package.json"))) {
      packages.push(entry);
    }
  }

  if (packages.length === 0) return null;
  packages.sort();
  return { kind: "saflib-node-modules", path: nodeModulesPath, packages };
}

export function findCompetingDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
): CompetingDependencyIssue[] {
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

  const issues: CompetingDependencyIssue[] = [];
  for (const [, info] of packageIndex) {
    if (isSaflibPackageDir(rootDir, info.dir)) continue;
    const packageJsonPath = path.join(info.dir, "package.json");
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps;
    for (const { field, name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const ownedSpecs = saflibSpecs.get(name);
      if (!ownedSpecs) continue;
      if (ownedSpecs.has(spec)) continue;
      issues.push({
        kind: "competing-dependency",
        packageJsonPath,
        packageName: pkg.name ?? packageJsonPath,
        field,
        dependency: name,
        productSpec: spec,
        saflibSpecs: [...ownedSpecs].sort(),
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
): RedundantDependencyWarning[] {
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

  const warnings: RedundantDependencyWarning[] = [];
  for (const [, info] of packageIndex) {
    if (isSaflibPackageDir(rootDir, info.dir)) continue;
    const packageJsonPath = path.join(info.dir, "package.json");
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps;
    for (const { field, name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const ownedSpecs = saflibSpecs.get(name);
      if (!ownedSpecs?.has(spec)) continue;
      warnings.push({
        packageJsonPath,
        packageName: pkg.name ?? packageJsonPath,
        field,
        dependency: name,
        spec,
      });
    }
  }

  return warnings.sort(
    (a, b) =>
      a.dependency.localeCompare(b.dependency) ||
      a.packageJsonPath.localeCompare(b.packageJsonPath),
  );
}

export function pruneStaleLockfileEntries(
  lockfile: PackageLock,
  rootDir: string,
): StaleLockfileIssue | null {
  const packages = lockfile.packages ?? {};
  const stalePaths = Object.keys(packages).filter((key) => {
    if (!isWorkspaceLockEntry(key)) return false;
    return !existsSync(path.join(rootDir, key, "package.json"));
  });
  if (stalePaths.length === 0) return null;

  const keysToDelete = new Set<string>();
  for (const stalePath of stalePaths) {
    keysToDelete.add(stalePath);
    for (const key of Object.keys(packages)) {
      if (key === stalePath || key.startsWith(`${stalePath}/`)) {
        keysToDelete.add(key);
      }
    }
  }

  for (const [key, entry] of Object.entries(packages)) {
    if (!entry?.link || !entry.resolved) continue;
    if (keysToDelete.has(entry.resolved)) {
      keysToDelete.add(key);
    }
  }

  for (const key of keysToDelete) {
    delete packages[key];
  }

  return {
    kind: "stale-lockfile",
    lockfilePath: path.join(rootDir, "package-lock.json"),
    stalePaths: [...stalePaths].sort(),
    removedCount: keysToDelete.size,
  };
}

export function analyzeProductLockPrune(
  rootDir: string,
): LockPruneAnalysis {
  const saflibDir = path.join(rootDir, "saflib");
  if (!existsSync(path.join(saflibDir, "package.json"))) {
    throw new Error(
      "saf-lock-prune requires a product repo with an embedded saflib/ workspace. Run from the product root.",
    );
  }

  const lockfilePath = path.join(rootDir, "package-lock.json");
  if (!existsSync(lockfilePath)) {
    throw new Error(`package-lock.json not found at ${lockfilePath}`);
  }

  const packageIndex = buildPackageIndex(rootDir);
  const issues: LockPruneIssue[] = [];

  const saflibNodeModules = inspectSaflibNodeModules(saflibDir);
  if (saflibNodeModules) issues.push(saflibNodeModules);

  issues.push(...findCompetingDependencies(rootDir, packageIndex));

  const warnings = findRedundantDependencies(rootDir, packageIndex);

  const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8")) as PackageLock;
  const staleLockfile = pruneStaleLockfileEntries(lockfile, rootDir);
  if (staleLockfile) issues.push(staleLockfile);

  return { rootDir, saflibDir, issues, warnings };
}

function formatIssue(issue: LockPruneIssue): string[] {
  switch (issue.kind) {
    case "saflib-node-modules":
      return [
        `saflib/node_modules should not contain installed packages (install from the product root only).`,
        `  path: ${issue.path}`,
        `  packages (${issue.packages.length}): ${issue.packages.slice(0, 8).join(", ")}${issue.packages.length > 8 ? ", ..." : ""}`,
      ];
    case "competing-dependency":
      return [
        `product declares ${issue.dependency}@${issue.productSpec} but saflib owns ${issue.saflibSpecs.join(", ")}.`,
        `  package: ${issue.packageName}`,
        `  file: ${issue.packageJsonPath}`,
        `  field: ${issue.field}`,
      ];
    case "stale-lockfile":
      return [
        `package-lock.json has ${issue.stalePaths.length} stale workspace entr${issue.stalePaths.length === 1 ? "y" : "ies"} (${issue.removedCount} total keys to remove).`,
        ...issue.stalePaths.slice(0, 5).map((entry) => `  - ${entry}`),
        ...(issue.stalePaths.length > 5
          ? [`  - ... ${issue.stalePaths.length - 5} more`]
          : []),
      ];
  }
}

async function defaultConfirm(message: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${message} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function removeSaflibNodeModules(issue: SaflibNodeModulesIssue): void {
  rmSync(issue.path, { recursive: true, force: true });
}

function removeCompetingDependency(issue: CompetingDependencyIssue): void {
  const pkg = JSON.parse(
    readFileSync(issue.packageJsonPath, "utf8"),
  ) as PackageJsonDeps;
  const fieldDeps = pkg[issue.field];
  if (!fieldDeps?.[issue.dependency]) return;
  delete fieldDeps[issue.dependency];
  if (Object.keys(fieldDeps).length === 0) {
    delete pkg[issue.field];
  }
  writeFileSync(issue.packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function writePrunedLockfile(issue: StaleLockfileIssue): void {
  const lockfile = JSON.parse(
    readFileSync(issue.lockfilePath, "utf8"),
  ) as PackageLock;
  pruneStaleLockfileEntries(lockfile, path.dirname(issue.lockfilePath));
  writeFileSync(issue.lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

export function applyLockPruneFixes(analysis: LockPruneAnalysis): string[] {
  const applied: string[] = [];
  for (const issue of analysis.issues) {
    switch (issue.kind) {
      case "saflib-node-modules":
        removeSaflibNodeModules(issue);
        applied.push(`removed ${issue.path}`);
        break;
      case "competing-dependency":
        removeCompetingDependency(issue);
        applied.push(
          `removed ${issue.dependency} from ${issue.packageJsonPath}`,
        );
        break;
      case "stale-lockfile":
        writePrunedLockfile(issue);
        applied.push(
          `pruned ${issue.removedCount} stale lockfile entries in ${issue.lockfilePath}`,
        );
        break;
    }
  }
  return applied;
}

export async function runLockPrune(
  options: LockPruneOptions = {},
): Promise<number> {
  const rootDir = path.resolve(
    options.rootDir ?? findMonorepoRoot(process.cwd()),
  );
  const analysis = analyzeProductLockPrune(rootDir);

  if (analysis.issues.length === 0 && analysis.warnings.length === 0) {
    console.log("No product/saflib workspace issues found.");
    return 0;
  }

  console.log(`Checked ${analysis.rootDir}`);
  console.log("");

  if (analysis.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of analysis.warnings) {
      console.log(
        `  ${warning.dependency}@${warning.spec} in ${warning.packageJsonPath} is redundant (saflib already owns it).`,
      );
    }
    console.log("");
  }

  if (analysis.issues.length === 0) {
    return 0;
  }

  for (const issue of analysis.issues) {
    for (const line of formatIssue(issue)) {
      console.log(line);
    }
    console.log("");
  }

  const confirm = options.confirm ?? defaultConfirm;
  const shouldFix =
    options.yes === true ||
    (await confirm("Apply fixes for the issues above?"));

  if (!shouldFix) {
    console.log("No changes made.");
    return 1;
  }

  const applied = applyLockPruneFixes(analysis);
  for (const line of applied) {
    console.log(`fixed: ${line}`);
  }
  console.log("");
  console.log("Run `npm install` from the product root to refresh node_modules.");
  return 0;
}
