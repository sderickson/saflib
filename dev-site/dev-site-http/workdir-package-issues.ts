/**
 * Dead-code issues for a package from the working tree — no git commit scan or
 * sqlite. Uses the same export/import extractors and usedBy rules as the DB path.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { BlobSpecialty } from "@saflib/dev-site-db/types";
import { parseSourceSpecialty } from "./analyze-commit.ts";
import {
  EXCLUDE_DIRS,
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
} from "./classify.ts";
import {
  exportUsedByKey,
  type ExportUsedBy,
} from "./assemble-export-used-by.ts";
import {
  moduleTargetFromImport,
  packageLocalPath,
  stripTsExt,
} from "./import-resolution.ts";
import {
  collectPackageIssues,
  type PackageDetailForIssues,
  type PackageIssue,
} from "./package-issues.ts";

export interface WorkdirPackageIssuesOptions {
  repoRoot: string;
  /** Limit walk to this prefix (e.g. `daemon`). Empty = whole repo. */
  productRoot?: string;
  packageName: string;
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

function exportsFromSpecialty(
  specialty: BlobSpecialty,
): Array<{ name: string; kind: string }> {
  return specialty.exports.map((e) => ({ name: e.name, kind: e.kind }));
}

/**
 * Scan the working tree under productRoot and list dead-code issues for one package.
 */
export async function collectWorkdirPackageIssues(
  options: WorkdirPackageIssuesOptions,
): Promise<WorkdirPackageIssuesResult> {
  const repoRoot = options.repoRoot;
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");
  const packageName = options.packageName;

  const walkRoot = productRoot ? path.join(repoRoot, productRoot) : repoRoot;
  const walkPrefix = productRoot;
  const allFiles = await walkRepoFiles(walkRoot, walkPrefix);
  const treePaths = allFiles.filter((p) => underProductRoot(p, productRoot));

  const packageJsonPaths = treePaths.filter(
    (p) => p === "package.json" || p.endsWith("/package.json"),
  );
  const nameByPath = new Map<string, string>();
  for (const pkgPath of packageJsonPaths) {
    const text = await readFile(path.join(repoRoot, pkgPath), "utf-8");
    const name = parsePackageName(text);
    if (name) nameByPath.set(pkgPath, name);
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
  const specialtyByPath = new Map<string, BlobSpecialty>();
  for (const repoPath of sourcePaths) {
    // Importers can live outside the target package; parse all product sources.
    const text = await readFile(path.join(repoRoot, repoPath), "utf-8");
    specialtyByPath.set(repoPath, parseSourceSpecialty(text));
  }

  const exports: Array<{ filePath: string; name: string; kind: string }> = [];
  for (const repoPath of sourcePaths) {
    if (!underPackage(repoPath)) continue;
    const fileName = repoPath.split("/").pop() ?? repoPath;
    if (isTestSourcePath(repoPath, fileName)) continue;
    const specialty = specialtyByPath.get(repoPath);
    if (!specialty) continue;
    for (const exp of exportsFromSpecialty(specialty)) {
      exports.push({
        filePath: repoPath,
        name: exp.name,
        kind: exp.kind,
      });
    }
  }

  const exportsByModule = new Map<
    string,
    Array<{ filePath: string; name: string }>
  >();
  const pkgPrefix = targetRoot.directory
    ? `${targetRoot.directory.replace(/\/+$/, "")}/`
    : "";
  for (const exp of exports) {
    const rel =
      pkgPrefix && exp.filePath.startsWith(pkgPrefix)
        ? exp.filePath.slice(pkgPrefix.length)
        : exp.filePath;
    let mod = stripTsExt(rel);
    if (mod.endsWith("/index")) mod = mod.slice(0, -"/index".length) || "index";
    if (mod === "" || mod === "index") mod = "index";
    let list = exportsByModule.get(mod);
    if (!list) {
      list = [];
      exportsByModule.set(mod, list);
    }
    list.push(exp);
  }

  const buckets = new Map<string, Map<string, ExportUsedBy>>();
  const addImporter = (
    exp: { filePath: string; name: string },
    used: ExportUsedBy,
  ) => {
    const eKey = exportUsedByKey(exp.filePath, exp.name);
    let byImporter = buckets.get(eKey);
    if (!byImporter) {
      byImporter = new Map();
      buckets.set(eKey, byImporter);
    }
    byImporter.set(`${used.packageName}\0${used.repoPath}`, used);
  };

  for (const repoPath of sourcePaths) {
    const fileName = repoPath.split("/").pop() ?? repoPath;
    if (isTestSourcePath(repoPath, fileName)) continue;
    const specialty = specialtyByPath.get(repoPath);
    if (!specialty) continue;
    const importerRoot = packageForPath(repoPath, roots);
    const used: ExportUsedBy = {
      packageName: importerRoot.packageName,
      filePath: packageLocalPath(repoPath, importerRoot.directory),
      repoPath,
    };

    for (const imp of specialty.imports) {
      const mod = moduleTargetFromImport(
        packageName,
        targetRoot.directory,
        repoPath,
        imp.specifier,
      );
      if (!mod) continue;
      const moduleExports = exportsByModule.get(mod);
      if (!moduleExports?.length) continue;

      const names = imp.names;
      const fileLevel =
        names.length === 0 || names.includes("*") || names.includes("default");

      if (fileLevel) {
        for (const exp of moduleExports) addImporter(exp, used);
        continue;
      }

      const wanted = new Set(names);
      for (const exp of moduleExports) {
        if (wanted.has(exp.name)) addImporter(exp, used);
      }
    }
  }

  const usedByMap = new Map<string, ExportUsedBy[]>();
  for (const [eKey, byImporter] of buckets) {
    usedByMap.set(
      eKey,
      [...byImporter.values()].sort(
        (a, b) =>
          a.packageName.localeCompare(b.packageName) ||
          a.filePath.localeCompare(b.filePath),
      ),
    );
  }

  const directory = targetRoot.directory;
  const detail: PackageDetailForIssues = {
    packageName,
    directory,
    productRoot,
    exports: exports.map((e) => ({
      name: e.name,
      kind: e.kind,
      filePath: e.filePath,
      usedBy: usedByMap.get(exportUsedByKey(e.filePath, e.name)) ?? [],
    })),
  };

  const issues = collectPackageIssues(detail, {
    packageDirectory: directory,
    productRoot,
  });

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
