// for documentation purposes
export type packageName = string;
export type directoryPath = string;

/**
 * Interface of package.json fields which are used in workspace discovery.
 */
export interface PackageJson {
  name: packageName;
  version?: string;
  private?: boolean;
  type?: string;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
  engines?: Record<string, string>;
  description?: string;
  /** SAF package metadata (`kind` is db / http / spec / sdk / spa / lib / …). */
  saf?: { kind?: string; envExtends?: string[] };
  scripts?: Record<string, string>;
  bin?: Record<string, string>;
  exports?: Record<string, string>;
}
