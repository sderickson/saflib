import type { WorkflowContext } from "../../types.ts";

/**
 * Input for the CopyStepMachine.
 */
export interface CopyStepInput {
  /**
   * kebab-case name of the thing being created from the template. Will be used to query replace instances of "template-file" and other variants like templateFile and template_file, though this behavior is deprecated and it's recommended to use the `lineReplace` function instead.
   */
  name?: string;

  /**
   * Absolute path to the directory where the updated copies of the template files will go.
   */
  targetDir: string;

  /**
   * Optional argument to do custom string transformations of template files and paths.
   */
  lineReplace?: (line: string) => string;

  /**
   * Optional flags for workflow area conditionals (e.g. IF upload).
   * Passed to template resolution so that BEGIN...IF flag...ELSE...END areas choose the correct branch.
   */
  flags?: Record<string, boolean>;

  /**
   * When walking directory template sources, skip files matching these
   * minimatch globs (matched against the absolute path with `/` separators).
   * Always combined with built-in skips for node_modules, dist, etc.
   *
   * Example (product/init): globs that match paths containing `__…__` segments
   * so expansion stubs stay in the golden product only.
   */
  skipSourceGlobs?: string[];

  /**
   * When walking directory template sources, skip files whose absolute path
   * returns true. Prefer {@link skipSourceGlobs} when a pattern is enough.
   */
  skipSourcePath?: (fullPath: string) => boolean;
}

/**
 * @internal
 */
export interface CopyStepContext extends WorkflowContext {
  filesToCopy: string[];
  name?: string;
  targetDir: string;
  copiedFiles: Record<string, string>;
  lineReplace?: (line: string) => string;
  sharedPrefix: string;
  flags?: Record<string, boolean>;
}
