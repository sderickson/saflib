import {
  existsSync,
  readFileSync,
  readdirSync,
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

type DepField = (typeof DEP_FIELDS)[number];

interface PackageJsonDeps {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface LockPackageEntry {
  version?: string;
  resolved?: string;
  link?: boolean;
  [key: string]: unknown;
}

interface PackageLock {
  packages?: Record<string, LockPackageEntry | undefined>;
}

export interface HoistingHazardIssue {
  kind: "hoisting-hazard";
  peer: string;
  requiredBy: string;
  saflibLockfileKey: string;
  rootLockfileKey: string;
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

export interface RedundantDependencyIssue {
  kind: "redundant-dependency";
  packageJsonPath: string;
  packageName: string;
  field: DepField;
  dependency: string;
  spec: string;
}

export interface StaleLockfileIssue {
  kind: "stale-lockfile";
  lockfilePath: string;
  stalePaths: string[];
  removedCount: number;
}

export type LockPruneIssue =
  | HoistingHazardIssue
  | CompetingDependencyIssue
  | RedundantDependencyIssue
  | StaleLockfileIssue;

export interface LockPruneAnalysis {
  rootDir: string;
  saflibDir: string;
  lockfilePath: string;
  issues: LockPruneIssue[];
  warnings: RedundantDependencyIssue[];
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

function lockfileKeyForPackage(nodeModulesPrefix: string, packageName: string): string {
  if (packageName.startsWith("@")) {
    const [scope, name] = packageName.split("/");
    return path.posix.join(nodeModulesPrefix, scope, name);
  }
  return path.posix.join(nodeModulesPrefix, packageName);
}

function listInstalledPackageNames(nodeModulesDir: string): Set<string> {
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

function listPackageDirectories(nodeModulesDir: string): string[] {
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

export function findHoistingHazards(rootDir: string): HoistingHazardIssue[] {
  const rootNodeModules = path.join(rootDir, "node_modules");
  const saflibNodeModules = path.join(rootDir, "saflib", "node_modules");
  if (!existsSync(rootNodeModules) || !existsSync(saflibNodeModules)) {
    return [];
  }

  const rootPackages = listInstalledPackageNames(rootNodeModules);
  const saflibPackages = listInstalledPackageNames(saflibNodeModules);
  const hazards: HoistingHazardIssue[] = [];

  for (const packageDir of listPackageDirectories(rootNodeModules)) {
    const pkg = JSON.parse(
      readFileSync(path.join(packageDir, "package.json"), "utf8"),
    ) as PackageJsonDeps;
    const peerDependencies = pkg.peerDependencies ?? {};
    const requiredBy = pkg.name ?? path.basename(packageDir);

    for (const peer of Object.keys(peerDependencies)) {
      if (rootPackages.has(peer)) continue;
      if (!saflibPackages.has(peer)) continue;
      hazards.push({
        kind: "hoisting-hazard",
        peer,
        requiredBy,
        saflibLockfileKey: lockfileKeyForPackage(
          "saflib/node_modules",
          peer,
        ),
        rootLockfileKey: lockfileKeyForPackage("node_modules", peer),
      });
    }
  }

  return hazards.sort(
    (a, b) =>
      a.peer.localeCompare(b.peer) || a.requiredBy.localeCompare(b.requiredBy),
  );
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

export function findCompetingDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
): CompetingDependencyIssue[] {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
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

function isProductAppPackage(packageJsonPath: string, rootDir: string): boolean {
  const rel = path
    .relative(rootDir, packageJsonPath)
    .split(path.sep)
    .join("/");
  return !rel.startsWith("clients/") && !rel.startsWith("deploy/");
}

export function findRedundantDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  options: { fixableOnly?: boolean } = {},
): RedundantDependencyIssue[] {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const issues: RedundantDependencyIssue[] = [];

  for (const [, info] of packageIndex) {
    if (isSaflibPackageDir(rootDir, info.dir)) continue;
    const packageJsonPath = path.join(info.dir, "package.json");
    if (options.fixableOnly && !isProductAppPackage(packageJsonPath, rootDir)) {
      continue;
    }
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps;
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

export function hoistMisplacedLockfilePeers(
  lockfile: PackageLock,
  hazards: HoistingHazardIssue[],
): string[] {
  const packages = lockfile.packages ?? {};
  const hoisted: string[] = [];

  for (const hazard of hazards) {
    if (packages[hazard.rootLockfileKey]) continue;
    const nestedEntry = packages[hazard.saflibLockfileKey];
    if (!nestedEntry) continue;

    packages[hazard.rootLockfileKey] = { ...nestedEntry };
    const keysToDelete = Object.keys(packages).filter(
      (key) =>
        key === hazard.saflibLockfileKey ||
        key.startsWith(`${hazard.saflibLockfileKey}/`),
    );
    for (const key of keysToDelete) {
      delete packages[key];
    }
    hoisted.push(hazard.peer);
  }

  return hoisted;
}

export function analyzeProductLockPrune(rootDir: string): LockPruneAnalysis {
  const saflibDir = path.join(rootDir, "saflib");
  if (!existsSync(path.join(saflibDir, "package.json"))) {
    throw new Error(
      "saf-monorepo lock-prune requires a product repo with an embedded saflib/ workspace. Run from the product root.",
    );
  }

  const lockfilePath = path.join(rootDir, "package-lock.json");
  if (!existsSync(lockfilePath)) {
    throw new Error(`package-lock.json not found at ${lockfilePath}`);
  }

  const packageIndex = buildPackageIndex(rootDir);
  const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8")) as PackageLock;
  const redundant = findRedundantDependencies(rootDir, packageIndex);
  const fixableRedundant = findRedundantDependencies(rootDir, packageIndex, {
    fixableOnly: true,
  });
  const warnings = redundant.filter(
    (issue) =>
      !fixableRedundant.some(
        (fixable) =>
          fixable.packageJsonPath === issue.packageJsonPath &&
          fixable.dependency === issue.dependency &&
          fixable.field === issue.field,
      ),
  );
  const issues: LockPruneIssue[] = [
    ...fixableRedundant,
    ...findCompetingDependencies(rootDir, packageIndex),
    ...findHoistingHazards(rootDir),
  ];

  const staleLockfile = pruneStaleLockfileEntries(lockfile, rootDir);
  if (staleLockfile) issues.push(staleLockfile);

  return { rootDir, saflibDir, lockfilePath, issues, warnings };
}

function formatIssue(issue: LockPruneIssue): string[] {
  switch (issue.kind) {
    case "hoisting-hazard":
      return [
        `${issue.peer} is only installed under saflib/node_modules but is a peer of root-hoisted ${issue.requiredBy}.`,
        `  move lockfile entry: ${issue.saflibLockfileKey} -> ${issue.rootLockfileKey}`,
      ];
    case "redundant-dependency":
      return [
        `product redundantly declares ${issue.dependency}@${issue.spec} (saflib already owns it).`,
        `  package: ${issue.packageName}`,
        `  file: ${issue.packageJsonPath}`,
        `  field: ${issue.field}`,
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

function removeDeclaredDependency(
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

function writePrunedLockfile(
  lockfilePath: string,
  mutate: (lockfile: PackageLock) => void,
): void {
  const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8")) as PackageLock;
  mutate(lockfile);
  writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

export function applyLockPruneFixes(analysis: LockPruneAnalysis): string[] {
  const applied: string[] = [];
  const hoistingHazards: HoistingHazardIssue[] = [];
  let wroteLockfile = false;

  for (const issue of analysis.issues) {
    switch (issue.kind) {
      case "redundant-dependency":
        removeDeclaredDependency(
          issue.packageJsonPath,
          issue.field,
          issue.dependency,
        );
        applied.push(
          `removed redundant ${issue.dependency} from ${issue.packageJsonPath}`,
        );
        break;
      case "competing-dependency":
        removeDeclaredDependency(
          issue.packageJsonPath,
          issue.field,
          issue.dependency,
        );
        applied.push(
          `removed competing ${issue.dependency} from ${issue.packageJsonPath}`,
        );
        break;
      case "hoisting-hazard":
        hoistingHazards.push(issue);
        break;
      case "stale-lockfile":
        writePrunedLockfile(issue.lockfilePath, (lockfile) => {
          pruneStaleLockfileEntries(lockfile, analysis.rootDir);
        });
        wroteLockfile = true;
        applied.push(
          `pruned ${issue.removedCount} stale lockfile entries in ${issue.lockfilePath}`,
        );
        break;
    }
  }

  if (hoistingHazards.length > 0) {
    writePrunedLockfile(analysis.lockfilePath, (lockfile) => {
      const hoisted = hoistMisplacedLockfilePeers(lockfile, hoistingHazards);
      for (const peer of hoisted) {
        applied.push(`hoisted ${peer} to the product root in package-lock.json`);
      }
    });
    wroteLockfile = true;
  }

  if (wroteLockfile) {
    applied.push(`updated ${analysis.lockfilePath}`);
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
    console.log("Warnings (not auto-fixed for clients/deploy packages):");
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
