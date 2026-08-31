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
import { toPackageDetailForIssues } from "./wire-maps.ts";

export interface WorkdirPackageIssuesOptions {
  repo_root: string;
  /** Limit walk to this prefix (e.g. `product`). Empty = whole repo. */
  product_root?: string;
  package_name: string;
  /** When true (default), include monorepo layout + LoC findings. */
  includeLayout?: boolean;
}

export interface WorkdirPackageIssuesResult {
  package_name: string;
  directory: string;
  product_root: string;
  source: "workdir";
  issueCount: number;
  issues: PackageIssue[];
  export_count: number;
}

function underProductRoot(repo_path: string, product_root: string): boolean {
  if (!product_root) return true;
  return repo_path === product_root || repo_path.startsWith(`${product_root}/`);
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
 * Scan the working tree under product_root and list issues for one package.
 */
export async function collectWorkdirPackageIssues(
  options: WorkdirPackageIssuesOptions,
): Promise<WorkdirPackageIssuesResult> {
  const repo_root = options.repo_root;
  const product_root = (options.product_root ?? "").replace(/^\/+|\/+$/g, "");
  const package_name = options.package_name;
  const includeLayout = options.includeLayout !== false;

  const walkRoot = product_root ? path.join(repo_root, product_root) : repo_root;
  const walkPrefix = product_root;
  const allFiles = await walkRepoFiles(walkRoot, walkPrefix);
  const treePaths = allFiles.filter((p) => underProductRoot(p, product_root));

  const packageJsonPaths = treePaths.filter(
    (p) => p === "package.json" || p.endsWith("/package.json"),
  );
  const nameByPath = new Map<string, string>();
  const exportsByPkgJson = new Map<string, Record<string, unknown> | string>();
  for (const pkgPath of packageJsonPaths) {
    const text = await readFile(path.join(repo_root, pkgPath), "utf-8");
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
  const targetRoot = roots.find((r) => r.package_name === package_name);
  if (!targetRoot) {
    return {
      package_name,
      directory: "",
      product_root,
      source: "workdir",
      issueCount: 0,
      issues: [],
      export_count: 0,
    };
  }

  const underPackage = (repo_path: string) => {
    const d = targetRoot.directory;
    if (!d) return true;
    return repo_path === d || repo_path.startsWith(`${d}/`);
  };

  const sourcePaths = treePaths.filter((p) => isSourcePath(p));
  const specialtyByPath = new Map<string, FileSpecialty>();
  for (const repo_path of sourcePaths) {
    const text = await readFile(path.join(repo_root, repo_path), "utf-8");
    specialtyByPath.set(repo_path, buildFileSpecialty(text));
  }

  const exports: Array<{ file_path: string; name: string; kind: string }> = [];
  for (const repo_path of sourcePaths) {
    if (!underPackage(repo_path)) continue;
    const file_name = repo_path.split("/").pop() ?? repo_path;
    if (isTestSourcePath(repo_path, file_name)) continue;
    if (isScaffoldTemplatePath(repo_path)) continue;
    const specialty = specialtyByPath.get(repo_path);
    if (!specialty) continue;
    for (const exp of specialty.exports) {
      exports.push({
        file_path: repo_path,
        name: exp.name,
        kind: exp.kind,
      });
    }
  }

  const importers: UsedByImporterUnit[] = [];
  for (const repo_path of sourcePaths) {
    const file_name = repo_path.split("/").pop() ?? repo_path;
    const specialty = specialtyByPath.get(repo_path);
    if (!specialty) continue;
    const importerRoot = packageForPath(repo_path, roots);
    importers.push({
      path: repo_path,
      packageName: importerRoot.package_name,
      packageDirectory: importerRoot.directory,
      isTest: isTestSourcePath(repo_path, file_name),
      imports: specialty.imports,
      localExportUsages: specialty.localExportUsages,
    });
  }

  const usedByMap = assembleUsedBy(
    package_name,
    targetRoot.directory,
    exports.map((e) => ({ filePath: e.file_path, name: e.name })),
    importers,
  );

  const directory = targetRoot.directory;
  const pkgJsonPath = directory ? `${directory}/package.json` : "package.json";
  const public_export_file_paths = listPackageJsonExportTargetFiles(
    exportsByPkgJson.get(pkgJsonPath),
  ).map((rel) => (directory ? `${directory}/${rel}` : rel));
  const layout_issues: PackageIssue[] = includeLayout
    ? checkPackageLayout({
        packageDir: path.join(repo_root, directory || "."),
        packageRepoPath: directory,
      })
    : [];

  const issues = collectPackageIssues(
    toPackageDetailForIssues({
      package_name,
      directory,
      product_root,
      exports: exports.map((e) => ({
        name: e.name,
        kind: e.kind,
        file_path: e.file_path,
        used_by: usedByMap.get(exportUsedByKey(e.file_path, e.name)) ?? [],
      })),
      layout_issues,
      public_export_file_paths,
    }),
    { packageDirectory: directory, productRoot: product_root },
  );

  return {
    package_name,
    directory,
    product_root,
    source: "workdir",
    issueCount: issues.length,
    issues,
    export_count: exports.length,
  };
}
