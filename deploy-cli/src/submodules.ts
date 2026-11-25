import { spawnSync } from "node:child_process";

export interface SubmoduleMismatch {
  path: string;
  /** `checkout`: a different commit than the repo records; `missing`: not checked out; `conflict`: merge conflict. */
  problem: "checkout" | "missing" | "conflict";
}

/**
 * Parses `git submodule status`: a leading `+` means the checked-out commit
 * isn't the one the repo records, `-` not initialized, `U` conflicts.
 */
export function parseSubmoduleStatus(output: string): SubmoduleMismatch[] {
  const problems: SubmoduleMismatch[] = [];
  for (const line of output.split("\n")) {
    const match = /^([ +\-U])[0-9a-f]+ (\S+)/.exec(line);
    if (!match) continue;
    const [, flag, path] = match;
    if (flag === "+") problems.push({ path, problem: "checkout" });
    if (flag === "-") problems.push({ path, problem: "missing" });
    if (flag === "U") problems.push({ path, problem: "conflict" });
  }
  return problems;
}

const DESCRIBE: Record<SubmoduleMismatch["problem"], string> = {
  checkout: "is checked out at a different commit than the repo records",
  missing: "isn't checked out",
  conflict: "has a merge conflict",
};

/**
 * Warns when a submodule (e.g. saflib) doesn't match the commit the repo
 * records, since images built from it won't match what's committed: a stale
 * checkout after switching branches built amd64-only images once. A warning,
 * not an error: deploying saflib work before bumping it is legitimate.
 */
export function warnOnSubmoduleMismatch(cwd: string): void {
  const result = spawnSync("git", ["submodule", "status"], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) return; // not a git checkout, or no git: nothing to say
  const problems = parseSubmoduleStatus(result.stdout);
  if (problems.length === 0) return;
  console.warn("");
  for (const { path, problem } of problems) {
    console.warn(`⚠ Submodule ${path} ${DESCRIBE[problem]}.`);
  }
  console.warn(
    "  Images will be built from what's checked out. If that's not intended, run `git submodule update` first.",
  );
  console.warn("");
}
