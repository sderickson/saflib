import { realpathSync } from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";

/** Changed in passing by routine commands (installs), so never flagged. */
const ALWAYS_EXPECTED = ["**/package-lock.json"];

export interface FindUnexpectedFilesOptions {
  /** Files a commit changed, relative to `repoRoot`. */
  changedFiles: string[];
  repoRoot: string;
  /** The run's starting directory: what `expectedFiles` are relative to. */
  runCwd: string;
  /** Paths or globs, relative to `runCwd`. See `WorkflowStep.expectedFiles`. */
  expectedFiles: string[];
  /** Absolute paths written by the run's copy steps. */
  copiedFiles: string[];
}

/**
 * Which of `changedFiles` fall outside a run's scope: its declared
 * `expectedFiles` (a plain path also covers everything under it), the
 * files its copy steps wrote, and lockfiles. Same rule as the original
 * workflow engine's `filterMatches`. Returns repo-relative paths.
 */
export function findUnexpectedFiles(options: FindUnexpectedFilesOptions): string[] {
  // git reports the root with symlinks resolved (macOS's /var is
  // /private/var), so resolve the run's own paths the same way.
  const repoRoot = realpathOr(options.repoRoot);
  const runCwd = realpathOr(options.runCwd);
  const toRepoRelative = (absolute: string) => path.relative(repoRoot, absolute);
  const patterns = [
    ...ALWAYS_EXPECTED,
    ...options.expectedFiles.map((entry) =>
      toRepoRelative(path.resolve(runCwd, entry)),
    ),
  ];
  const copied = options.copiedFiles.map((file) => toRepoRelative(realpathOr(file)));

  return options.changedFiles.filter((file) => {
    if (copied.some((copiedFile) => isSameOrInside(file, copiedFile))) return false;
    return !patterns.some(
      (pattern) => isSameOrInside(file, pattern) || minimatch(file, pattern, { dot: true }),
    );
  });
}

function isSameOrInside(file: string, dir: string): boolean {
  return file === dir || file.startsWith(`${dir}/`);
}

function realpathOr(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}
