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
}

/**
 * Reverse-index of non-test importers for each export in a package.
 * Pure — no FS / git / DB. Key: `${filePath}\0${exportName}`.
 */
export function assembleUsedBy(
  packageName: string,
  packageDirectory: string,
  exports: Array<{ filePath: string; name: string }>,
  importers: UsedByImporterUnit[],
): ExportUsedByMap {
  const out: ExportUsedByMap = new Map();
  if (exports.length === 0) return out;

  const exportsByModule = new Map<
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
      const mod = moduleTargetFromImport(
        packageName,
        packageDirectory,
        unit.path,
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
