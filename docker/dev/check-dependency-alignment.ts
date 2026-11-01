#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Fails if the lockfile installs any package below a workspace directory, the
 * same check the dev stack runs before installing. product/init and CI run it.
 *
 * Usage: check-dependency-alignment.ts [monorepo-root]  (default: cwd)
 */
import path from "node:path";
import {
  findDependencyMisalignment,
  formatDependencyMisalignment,
  readLockPackages,
} from "./dependency-alignment.ts";

const root = path.resolve(process.argv[2] ?? process.cwd());
const report = formatDependencyMisalignment(
  findDependencyMisalignment(readLockPackages(root)),
  "[deps]",
);
if (report) {
  console.error(report);
  process.exit(1);
}
console.log(`[deps] Dependency versions are aligned (${root}).`);
