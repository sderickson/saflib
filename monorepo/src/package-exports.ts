import {
  ROOT_TS_ALLOWLIST,
  isAllowedRootTsFile,
  type PackageJsonLayoutFields,
} from "./package-layout.ts";
import {
  importsFromExports,
  stripTemplateImportPlaceholders,
  upsertImportGlob,
} from "./package-imports.ts";

export {
  importGlobForTopLevelSegment,
  importsFromExports,
  ROOT_IMPORT_CATCHALL,
  stripTemplateImportPlaceholders,
  upsertImportGlob,
} from "./package-imports.ts";

export function exportGlobForTopLevelSegment(segment: string): {
  key: string;
  value: string;
} {
  return {
    key: `./${segment}/*`,
    value: `./${segment}/*.ts`,
  };
}

/** Remove template placeholder export keys/values (e.g. `./__group-name__/*`). */
export function stripTemplateExportPlaceholders(
  exports: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!exports) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(exports)) {
    if (key.includes("__") || String(value).includes("__")) continue;
    out[key] = value;
  }
  return out;
}

export function upsertExportGlob(
  exports: Record<string, unknown>,
  topLevelSegment: string,
): Record<string, unknown> {
  const { key, value } = exportGlobForTopLevelSegment(topLevelSegment);
  if (exports[key] === value) return exports;
  return { ...exports, [key]: value };
}

export function upsertExplicitExport(
  exports: Record<string, unknown>,
  stem: string,
): Record<string, unknown> {
  const key = `./${stem}`;
  const value = `./${stem}.ts`;
  if (exports[key] === value) return exports;
  return { ...exports, [key]: value };
}

export interface ExportModulePathLayout {
  topLevelSegment: string;
  useGlob: boolean;
}

/**
 * Validates an export module path from {@link parsePath} and returns how to
 * upsert `package.json` exports (glob on the first folder segment, or an
 * explicit `./stem` entry for allowlisted root files).
 */
export function resolveExportModulePathLayout(
  groupName: string,
  targetName: string,
): ExportModulePathLayout {
  if (groupName === targetName) {
    const fileName = `${targetName}.ts`;
    if (!isAllowedRootTsFile(fileName)) {
      throw new Error(
        `Export path must include a thematic subfolder (e.g. ./lib/${targetName}.ts). ` +
          `Root-level source files are only allowed for: ${[...ROOT_TS_ALLOWLIST].sort().join(", ")}.`,
      );
    }
    return { topLevelSegment: targetName, useGlob: false };
  }

  const first = groupName.split("/")[0];
  if (!first) {
    throw new Error("Invalid export path");
  }
  return { topLevelSegment: first, useGlob: true };
}

export function upsertPackageExportForModule(
  exports: Record<string, unknown>,
  groupName: string,
  targetName: string,
): Record<string, unknown> {
  const layout = resolveExportModulePathLayout(groupName, targetName);
  if (layout.useGlob) {
    return upsertExportGlob(exports, layout.topLevelSegment);
  }
  return upsertExplicitExport(exports, layout.topLevelSegment);
}

export function upsertPackageJsonExportsForModule(
  packageJson: PackageJsonLayoutFields,
  groupName: string,
  targetName: string,
): PackageJsonLayoutFields {
  const exportsMap = upsertPackageExportForModule(
    stripTemplateExportPlaceholders(
      (packageJson.exports ?? {}) as Record<string, unknown>,
    ),
    groupName,
    targetName,
  );
  const layout = resolveExportModulePathLayout(groupName, targetName);
  let imports = {
    ...stripTemplateImportPlaceholders(
      (packageJson.imports ?? {}) as Record<string, unknown>,
    ),
    ...importsFromExports(exportsMap),
  };
  if (layout.useGlob) {
    imports = upsertImportGlob(imports, layout.topLevelSegment);
  }
  return {
    ...packageJson,
    exports: exportsMap,
    imports,
  };
}

export function prepareNewPackageExports(
  packageJson: PackageJsonLayoutFields,
): PackageJsonLayoutFields {
  const exports = stripTemplateExportPlaceholders(
    (packageJson.exports ?? {}) as Record<string, unknown>,
  );
  const imports = {
    ...stripTemplateImportPlaceholders(
      (packageJson.imports ?? {}) as Record<string, unknown>,
    ),
    ...importsFromExports(exports),
  };
  return {
    ...packageJson,
    exports,
    imports,
  };
}
