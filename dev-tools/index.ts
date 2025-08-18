/**
 * Set of utilities for workspace packages.
 *
 * @module @saflib/dev-tools
 */

export {
  buildMonorepoContext,
  getAllPackageWorkspaceDependencies,
  getCurrentPackageName,
  type MonorepoPackageJsons,
  type MonorepoPackageDirectories,
  type WorkspaceDependencyGraph,
  type MonorepoContext,
} from "./src/workspace.ts";

export { type PackageJson } from "./types.ts";
