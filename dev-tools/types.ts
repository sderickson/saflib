// for documentation purposes
export type packageName = string;
export type directoryPath = string;

/**
 * Interface of package.json fields which are used in this package.
 *
 * See [NPM docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
 * for more information.
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
  scripts?: Record<string, string>;
  bin?: Record<string, string>;
  exports?: Record<string, string>;
}

