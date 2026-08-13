import fs from "node:fs";
import path from "node:path";
import type { PackageJson } from "@saflib/monorepo/workspace";

/** Entry probe for snapshot `entries` measurement. */
export interface SafImportsEntryProbe {
  label: string;
  packageName: string;
  exportPath: string;
}

/** Vitest/npm suite timing target stored in snapshot `suites`. */
export interface SafImportsSuiteTarget {
  /** Key in snapshot JSON `suites` map. */
  key: string;
  /** Repo-relative package directory (cwd for the command). */
  packageDir: string;
  /** When set, run `npx vitest run -- <pattern>` instead of `npm run test`. */
  vitestPattern?: string;
}

/** Optional bundle measurement targets for snapshot generation. */
export interface SafImportsBundleTarget {
  buildWorkspace: string;
  singleSpaFallback?: string;
  /** SPA keys measured via `saf-imports spa` (e.g. app, admin). */
  spas?: string[];
  budgets?: Record<string, { maxShellJsGzipBytes?: number }>;
}

/** Manual `sideEffects` overrides for `apply-side-effects.mjs` (product-specific). */
export type SafImportsSideEffectsOverrides = Record<string, string[] | false>;

/** Repo-root `package.json` → `safImports.snapshot` (product-specific; optional). */
export interface SafImportsSnapshotConfig {
  entryProbes?: SafImportsEntryProbe[];
  suites?: SafImportsSuiteTarget[];
  warmTypecheckPackageDir?: string;
  bundles?: SafImportsBundleTarget;
  /** Repo-relative path for update-baseline-bundles.mjs output. */
  baselineBundlesPath?: string;
}
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
  snapshot?: SafImportsSnapshotConfig;
  /** Repo-relative parent of SPA client packages (e.g. `myproduct/clients`). */
  clientsRoot?: string;
  /** Repo-relative env file loaded during client bundle snapshot builds. */
  devEnvFile?: string;
  sideEffectsOverrides?: SafImportsSideEffectsOverrides;
}

function readPackageJson(filePath: string): PackageJson & {
  safImports?: SafImportsRootConfig | SafImportsPackageConfig;
} {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PackageJson & {
    safImports?: SafImportsRootConfig | SafImportsPackageConfig;
  };
}

/** Read `safImports.snapshot` from the monorepo root `package.json`, if present. */
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
