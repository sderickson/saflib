import { execFileSync } from "node:child_process";
import path from "node:path";
import { findMonorepoRoot } from "@saflib/imports";
import {
  isEmbeddedProductMonorepo,
  readPlatformContract,
} from "../lock-prune/platform.ts";
import { syncPlatformOverrides } from "../lock-prune/package-deps.ts";
import { runLockPrune } from "../lock-prune/run.ts";

export interface SaflibBumpOptions {
  rootDir?: string;
  /** What to move the submodule to (default `origin/main`, fetched first). */
  ref?: string;
  /** Runs a command in `cwd` and returns its stdout (git, npm). */
  exec?: (command: string, args: string[], cwd: string) => string;
  /** lock-prune with --fix (injectable for tests). */
  lockPrune?: (rootDir: string) => Promise<number>;
}

const defaultExec = (command: string, args: string[], cwd: string) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

/**
 * Bump a product's saflib submodule and bring the product along: move the
 * submodule (after fetching, so a stale local `main` can't send it backwards),
 * copy saflib's root overrides (npm only honors overrides at the install
 * root), re-resolve the lockfile, and run lock-prune's fix loop. Leaves the
 * changes uncommitted for typecheck, tests and review.
 */
export async function runSaflibBump(
  options: SaflibBumpOptions = {},
): Promise<number> {
  const rootDir = path.resolve(
    options.rootDir ?? findMonorepoRoot(process.cwd()),
  );
  if (!isEmbeddedProductMonorepo(rootDir)) {
    throw new Error(
      "saf-monorepo saflib-bump runs in a product repo with a saflib/ submodule.",
    );
  }
  const exec = options.exec ?? defaultExec;
  const lockPrune =
    options.lockPrune ?? ((dir) => runLockPrune({ rootDir: dir, fix: true }));
  const saflibDir = path.join(rootDir, "saflib");
  const ref = options.ref ?? "origin/main";

  exec("git", ["fetch", "--quiet", "origin"], saflibDir);
  const before = exec(
    "git",
    ["rev-parse", "--short", "HEAD"],
    saflibDir,
  ).trim();
  const target = exec("git", ["rev-parse", "--short", ref], saflibDir).trim();
  if (before === target) {
    console.log(`saflib is already at ${ref} (${target}).`);
  } else {
    // A bump only moves forward: if HEAD isn't an ancestor of the target,
    // the target is older (or unrelated), e.g. a ref that wasn't fetched.
    try {
      exec("git", ["merge-base", "--is-ancestor", before, target], saflibDir);
    } catch {
      console.error(
        `saflib's ${ref} (${target}) doesn't contain the current commit (${before}); refusing to move backwards. Pass --ref to choose explicitly.`,
      );
      return 1;
    }
    exec("git", ["checkout", "--quiet", "--detach", target], saflibDir);
    const log = exec(
      "git",
      ["log", "--oneline", `${before}..${target}`],
      saflibDir,
    ).trim();
    console.log(`saflib ${before} -> ${target}:`);
    console.log(
      log
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
    );
  }

  const applied = syncPlatformOverrides(rootDir, readPlatformContract(rootDir));
  console.log(
    applied.length
      ? `Copied saflib's overrides: ${applied.join(", ")}`
      : "Root overrides already match saflib's.",
  );

  console.log("Re-resolving package-lock.json...");
  exec(
    "npm",
    [
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    rootDir,
  );

  const code = await lockPrune(rootDir);
  console.log("");
  console.log(
    "Next: npm install, typecheck, unit tests, then commit (saflib, package.json, package-lock.json).",
  );
  return code;
}
