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
  /** When set, run `npm exec vitest run -- <pattern>` instead of `npm run test`. */
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
  boundaries?: SafImportsBoundariesConfig;
}

/**
 * A forbidden-dependency rule for `saf-imports boundaries`. Selectors are
 * package-name globs, `dir:<repo-relative glob>`, or `kind:<saf.kind>`.
 */
export interface SafImportsBoundaryRule {
  /** Short identifier shown in violation keys. */
  name: string;
  /** Packages the rule constrains. */
  from: string[];
  /** Packages they must not import. */
  disallow: string[];
  /** Exceptions to `disallow`. */
  allow?: string[];
  /**
   * Only these parts of a disallowed package are off limits: globs over the
   * import path within the package (`json-spec`, `operations/*`, `.` for the
   * root). Other subpaths, and the bare dependency declaration, are allowed.
   */
  subpaths?: string[];
  /** Also apply to test/tooling files (default: runtime files only). */
  includeDev?: boolean;
}

/** Repo-root `package.json` → `safImports.boundaries`. */
export interface SafImportsBoundariesConfig {
  /** Repo-relative path of the accepted-violations baseline JSON. */
  baseline?: string;
  /**
   * Packages whose imports are checked (same selectors as rules). Defaults to
   * every workspace package; other packages still count as import targets.
   */
  scope?: string[];
  rules?: SafImportsBoundaryRule[];
  /** Extra regexes (package-relative paths) for test/tooling-only files. */
  devFilePatterns?: string[];
  /**
   * Built-in layer rules derived from each package's `saf.kind` (see
   * `src/boundaries/layers.ts`). On by default; `false` opts out.
   */
  layers?: boolean;
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
