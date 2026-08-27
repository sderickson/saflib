/**
 * Package issues from the working tree — no git commit scan or sqlite.
 * Uses shared FactSpecialty + assembleUsedBy from @saflib/imports.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  assembleUsedBy,
  buildFileSpecialty,
  collectPackageIssues,
  exportUsedByKey,
  type FileSpecialty,
  type PackageIssue,
  type UsedByImporterUnit,
} from "@saflib/imports";
import {
  checkPackageLayout,
  listPackageJsonExportTargetFiles,
} from "@saflib/monorepo";
import {
  EXCLUDE_DIRS,
  isSourcePath,
  isScaffoldTemplatePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
} from "./classify.ts";

export interface WorkdirPackageIssuesOptions {
  repoRoot: string;
  /** Limit walk to this prefix (e.g. `product`). Empty = whole repo. */
  productRoot?: string;
  packageName: string;
  /** When true (default), include monorepo layout + LoC findings. */
  includeLayout?: boolean;
}

export interface WorkdirPackageIssuesResult {
  packageName: string;
  directory: string;
  productRoot: string;
  source: "workdir";
  issueCount: number;
  issues: PackageIssue[];
  exportCount: number;
}

function underProductRoot(repoPath: string, productRoot: string): boolean {
  if (!productRoot) return true;
  return repoPath === productRoot || repoPath.startsWith(`${productRoot}/`);
}

async function walkRepoFiles(
  absDir: string,
  repoRelDir: string,
): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const repoRel = repoRelDir ? `${repoRelDir}/${entry.name}` : entry.name;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkRepoFiles(abs, repoRel)));
    } else if (entry.isFile()) {
      out.push(repoRel.replace(/\\/g, "/"));
    }
  }
  return out;
}

/**
 * Scan the working tree under productRoot and list issues for one package.
 */
export async function collectWorkdirPackageIssues(
  options: WorkdirPackageIssuesOptions,
): Promise<WorkdirPackageIssuesResult> {
  const repoRoot = options.repoRoot;
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");
  const packageName = options.packageName;
  const includeLayout = options.includeLayout !== false;

  const walkRoot = productRoot ? path.join(repoRoot, productRoot) : repoRoot;
  const walkPrefix = productRoot;
  const allFiles = await walkRepoFiles(walkRoot, walkPrefix);
  const treePaths = allFiles.filter((p) => underProductRoot(p, productRoot));

  const packageJsonPaths = treePaths.filter(
    (p) => p === "package.json" || p.endsWith("/package.json"),
  );
  const nameByPath = new Map<string, string>();
  const exportsByPkgJson = new Map<string, Record<string, unknown> | string>();
  for (const pkgPath of packageJsonPaths) {
    const text = await readFile(path.join(repoRoot, pkgPath), "utf-8");
    const name = parsePackageName(text);
    if (name) nameByPath.set(pkgPath, name);
    try {
      const parsed = JSON.parse(text) as {
        exports?: Record<string, unknown> | string;
      };
      if (parsed.exports) exportsByPkgJson.set(pkgPath, parsed.exports);
    } catch {
      // ignore malformed package.json; layout check will also fail open
    }
  }
  const roots = packageRootsFromPackageJsonPaths(packageJsonPaths, nameByPath);
  const targetRoot = roots.find((r) => r.packageName === packageName);
  if (!targetRoot) {
    return {
      packageName,
      directory: "",
      productRoot,
      source: "workdir",
      issueCount: 0,
      issues: [],
      exportCount: 0,
    };
  }

  const underPackage = (repoPath: string) => {
    const d = targetRoot.directory;
    if (!d) return true;
    return repoPath === d || repoPath.startsWith(`${d}/`);
  };

  const sourcePaths = treePaths.filter((p) => isSourcePath(p));
  const specialtyByPath = new Map<string, FileSpecialty>();
  for (const repoPath of sourcePaths) {
    const text = await readFile(path.join(repoRoot, repoPath), "utf-8");
    specialtyByPath.set(repoPath, buildFileSpecialty(text));
  }

  const exports: Array<{ filePath: string; name: string; kind: string }> = [];
  for (const repoPath of sourcePaths) {
    if (!underPackage(repoPath)) continue;
    const fileName = repoPath.split("/").pop() ?? repoPath;
    if (isTestSourcePath(repoPath, fileName)) continue;
    if (isScaffoldTemplatePath(repoPath)) continue;
    const specialty = specialtyByPath.get(repoPath);
    if (!specialty) continue;
    for (const exp of specialty.exports) {
      exports.push({
        filePath: repoPath,
        name: exp.name,
        kind: exp.kind,
      });
    }
  }

  const importers: UsedByImporterUnit[] = [];
  for (const repoPath of sourcePaths) {
    const fileName = repoPath.split("/").pop() ?? repoPath;
    const specialty = specialtyByPath.get(repoPath);
    if (!specialty) continue;
    const importerRoot = packageForPath(repoPath, roots);
    importers.push({
      path: repoPath,
      packageName: importerRoot.packageName,
      packageDirectory: importerRoot.directory,
      isTest: isTestSourcePath(repoPath, fileName),
      imports: specialty.imports,
      localExportUsages: specialty.localExportUsages,
    });
  }

  const usedByMap = assembleUsedBy(
    packageName,
    targetRoot.directory,
    exports,
    importers,
  );

  const directory = targetRoot.directory;
  const pkgJsonPath = directory ? `${directory}/package.json` : "package.json";
  const publicExportFilePaths = listPackageJsonExportTargetFiles(
    exportsByPkgJson.get(pkgJsonPath),
  ).map((rel) => (directory ? `${directory}/${rel}` : rel));
  const layoutIssues: PackageIssue[] = includeLayout
    ? checkPackageLayout({
        packageDir: path.join(repoRoot, directory || "."),
        packageRepoPath: directory,
      }).map((i) => ({
        kind: i.kind,
        title: i.title,
        name: i.name,
        kindLabel: i.kindLabel,
        filePath: i.filePath,
        repoPath: i.repoPath,
      }))
    : [];

  const issues = collectPackageIssues(
    {
      packageName,
      directory,
      productRoot,
      exports: exports.map((e) => ({
        name: e.name,
        kind: e.kind,
        filePath: e.filePath,
        usedBy: usedByMap.get(exportUsedByKey(e.filePath, e.name)) ?? [],
      })),
      layoutIssues,
      publicExportFilePaths,
    },
    { packageDirectory: directory, productRoot },
  );

  return {
    packageName,
    directory,
    productRoot,
    source: "workdir",
    issueCount: issues.length,
    issues,
    exportCount: exports.length,
  };
}
