import fs from "node:fs";
import path from "node:path";
import type { PackageJson } from "@saflib/dev-tools";

/** Entry probe for baseline `entries` measurement. */
export interface SafImportsEntryProbe {
  label: string;
  packageName: string;
  exportPath: string;
}

/** Vitest/npm suite timing target stored in baseline `suites`. */
export interface SafImportsSuiteTarget {
  /** Key in baseline.json `suites` map. */
  key: string;
  /** Repo-relative package directory (cwd for the command). */
  packageDir: string;
  /** When set, run `npx vitest run -- <pattern>` instead of `npm run test`. */
  vitestPattern?: string;
}

/** Optional bundle measurement targets for baseline generation. */
export interface SafImportsBundleTarget {
  buildWorkspace: string;
  singleSpaFallback?: string;
}

/** Repo-root `package.json` → `safImports.baseline` (product-specific; optional). */
export interface SafImportsBaselineConfig {
  entryProbes?: SafImportsEntryProbe[];
  suites?: SafImportsSuiteTarget[];
  warmTypecheckPackageDir?: string;
  bundles?: SafImportsBundleTarget;
}

/** Per-package `package.json` → `safImports.compositionRoot`. */
export interface SafImportsCompositionRootConfig {
  /** Union every typecheckable package sharing this package's parent directory. */
  includeSiblingPackages?: boolean;
  /** Union every typecheckable package under this repo-relative directory. */
  includePackagesUnder?: string;
}

export interface SafImportsPackageConfig {
  compositionRoot?: SafImportsCompositionRootConfig;
}

export interface SafImportsRootConfig {
  baseline?: SafImportsBaselineConfig;
}

function readPackageJson(filePath: string): PackageJson & {
  safImports?: SafImportsRootConfig | SafImportsPackageConfig;
} {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PackageJson & {
    safImports?: SafImportsRootConfig | SafImportsPackageConfig;
  };
}

/** Read `safImports.baseline` from the monorepo root `package.json`, if present. */
export function readRootSafImportsConfig(root: string): SafImportsRootConfig {
  const pjPath = path.join(root, "package.json");
  if (!fs.existsSync(pjPath)) return {};
  try {
    const pj = readPackageJson(pjPath);
    return (pj.safImports as SafImportsRootConfig | undefined) ?? {};
  } catch {
    return {};
  }
}

/** Read `safImports.compositionRoot` from a workspace package, if present. */
export function readPackageSafImportsConfig(
  packageDir: string,
): SafImportsPackageConfig {
  const pjPath = path.join(packageDir, "package.json");
  if (!fs.existsSync(pjPath)) return {};
  try {
    const pj = readPackageJson(pjPath);
    return (pj.safImports as SafImportsPackageConfig | undefined) ?? {};
  } catch {
    return {};
  }
}
