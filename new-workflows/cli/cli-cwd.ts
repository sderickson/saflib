import { resolve } from "node:path";

/**
 * Working directory for resolving workflow paths and run cwd.
 *
 * `npm exec -w <pkg>` sets `process.cwd()` to the workspace package root, but
 * keeps `INIT_CWD` as the directory where the user invoked npm. Prefer that so
 * repo-relative paths like `./power-up/plans/...` and `power-up/service/db`
 * resolve correctly when dogfooding from the monorepo root.
 */
export function cliCwd(): string {
  const init = process.env.INIT_CWD?.trim();
  if (init) return resolve(init);
  return process.cwd();
}
