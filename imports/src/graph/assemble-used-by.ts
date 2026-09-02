import {
  exportUsedByKey,
  moduleTargetFromImport,
  packageLocalPath,
  stripTsExt,
  type ImportUsedBy,
} from "./import-resolution.ts";

export type ExportUsedBy = ImportUsedBy;
export type ExportUsedByMap = Map<string, ExportUsedBy[]>;

export interface UsedByImporterUnit {
  /** Repo-relative path. */
  path: string;
  packageName: string;
  packageDirectory: string;
  isTest: boolean;
  imports: Array<{ specifier: string; names: string[] }>;
  /**
   * Export names this file references as values (beyond declarations).
   * Creates a same-file `usedBy` edge so in-file helpers aren't `dead-code`.
   */
  localExportUsages?: string[];
}

/**
 * Reverse-index of non-test importers for each export in a package.
 * Pure — no FS / git / DB. Key: `${filePath}\0${exportName}`.
 *
 * Also records same-file self-usages from {@link UsedByImporterUnit.localExportUsages}.
 */
export interface AssembleUsedByOptions {
  /**
   * Resolve an import to the repo-relative path of the target module file.
   * Used for workspace package exports and `#` import maps where
   * {@link moduleTargetFromImport} only matches disk-shaped subpaths.
   */
  resolveImportTarget?: (
    importerPath: string,
    specifier: string,
  ) => string | null;
}

export function assembleUsedBy(
  packageName: string,
  packageDirectory: string,
  exports: Array<{ filePath: string; name: string }>,
  importers: UsedByImporterUnit[],
  options: AssembleUsedByOptions = {},
): ExportUsedByMap {
  const out: ExportUsedByMap = new Map();
  if (exports.length === 0) return out;

  const exportsByModule = new Map<
    string,
    Array<{ filePath: string; name: string }>
  >();
  const exportsByRepoPath = new Map<
    string,
    Array<{ filePath: string; name: string }>
  >();
  const pkgPrefix = packageDirectory
    ? `${packageDirectory.replace(/\/+$/, "")}/`
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

    let byPath = exportsByRepoPath.get(exp.filePath);
    if (!byPath) {
      byPath = [];
      exportsByRepoPath.set(exp.filePath, byPath);
    }
    byPath.push(exp);
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

  for (const unit of importers) {
    if (unit.isTest) continue;
    const used: ExportUsedBy = {
      packageName: unit.packageName,
      filePath: packageLocalPath(unit.path, unit.packageDirectory),
      repoPath: unit.path,
    };

    for (const imp of unit.imports) {
      const names = imp.names;
      const fileLevel =
        names.length === 0 || names.includes("*") || names.includes("default");
      const wanted = new Set(names);

      const targetPath = options.resolveImportTarget?.(
        unit.path,
        imp.specifier,
      );
      if (targetPath) {
        const fileExports = exportsByRepoPath.get(targetPath);
        if (fileExports?.length) {
          if (fileLevel) {
            for (const exp of fileExports) addImporter(exp, used);
          } else {
            for (const exp of fileExports) {
              if (wanted.has(exp.name)) addImporter(exp, used);
            }
          }
          continue;
        }
      }

      const mod = moduleTargetFromImport(
        packageName,
        packageDirectory,
        unit.path,
        imp.specifier,
      );
      if (!mod) continue;
      const moduleExports = exportsByModule.get(mod);
      if (!moduleExports?.length) continue;

      if (fileLevel) {
        for (const exp of moduleExports) addImporter(exp, used);
        continue;
      }

      for (const exp of moduleExports) {
        if (wanted.has(exp.name)) addImporter(exp, used);
      }
    }

    const localUsages = unit.localExportUsages;
    if (localUsages?.length) {
      const fileExports = exportsByRepoPath.get(unit.path);
      if (fileExports?.length) {
        const wanted = new Set(localUsages);
        for (const exp of fileExports) {
          if (wanted.has(exp.name)) addImporter(exp, used);
        }
      }
    }
  }

  for (const [eKey, byImporter] of buckets) {
    out.set(
      eKey,
      [...byImporter.values()].sort(
        (a, b) =>
          a.packageName.localeCompare(b.packageName) ||
          a.filePath.localeCompare(b.filePath),
      ),
    );
  }

  return out;
}
