/** Package metadata indexed by workspace package name. */
export interface PackageInfo {
  dir: string;
  exports: unknown;
}

/** Index of workspace packages discovered under a monorepo root. */
export type PackageIndex = Map<string, PackageInfo>;

/** Successful resolve to a first-party workspace file. */
export interface ResolvedFile {
  kind: "file";
  path: string;
}

/** Bare specifier that is not a workspace package (npm / Node built-in). */
export interface ResolvedExternal {
  kind: "external";
  root: string;
}

export type ResolveResult = ResolvedFile | ResolvedExternal | null;

export interface ImportSpec {
  spec: string;
  isTypeOnly: boolean;
}

export interface MeasureGraphOptions {
  /** When true, follow `import type` / `export type` edges. Default false. */
  includeTypes?: boolean;
  /** Monorepo root; auto-detected from the entry file when omitted. */
  root?: string;
  /** When true, include sorted first-party paths and external package roots. */
  verbose?: boolean;
}

export interface MeasureGraphResult {
  /** First-party workspace modules reachable from the entry. */
  modules: number;
  /** Total line count across visited first-party files. */
  lines: number;
  /** Distinct external npm package roots. */
  ext: number;
  /** Repo-root-relative first-party paths (only when `verbose: true`). */
  files?: string[];
  /** Sorted external package roots (only when `verbose: true`). */
  externals?: string[];
}

/** Shared options for graph walks (`measure`, `why`, `cycles`). */
export type GraphWalkOptions = MeasureGraphOptions;

/**
 * Shortest import path from entry to target as display labels
 * (entry path, then each import specifier along the chain).
 * `null` if unreachable.
 */
export type FindPathResult = string[] | null;
