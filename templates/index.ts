import path from "node:path";
import { fileURLToPath } from "node:url";

const templatesPackageRoot = path.dirname(fileURLToPath(import.meta.url));
// Normally this package's own location tells you where saflib lives — true
// for a real checkout, and for containers that bind-mount the whole repo
// (e.g. the monolith). It's wrong for dev-site-docker's image specifically:
// dev-site-http runs from a *baked* copy of saflib for its own code, but
// workflows it runs need to write into the *bind-mounted* checkout at
// $DEV_SITE_REPO_ROOT instead — see SAFLIB_ROOT in docker-compose.yaml.
const saflibRoot = process.env.SAFLIB_ROOT?.trim() || path.resolve(templatesPackageRoot, "..");

/** Root of the `@saflib/templates` package (path helpers only). */
export { templatesPackageRoot };

/** Saflib monorepo root (parent of `base/`, `deploy/`, library packages). */
export const templatesSaflibRoot = saflibRoot;

/**
 * Golden product tree (`clients`, `service`, `dev`, `plans`).
 * product/init copies this to `<productName>/`.
 */
export const templatesProductRoot = path.join(saflibRoot, "base");

/** Deploy tree copied to `./deploy` by product/init (or `$SAF_DEPLOY_DIR`). */
export const templatesDeployRoot = path.join(saflibRoot, "deploy");

/**
 * Runtime deploy directory name relative to the workflow cwd.
 * Defaults to `deploy`. Set `SAF_DEPLOY_DIR` (e.g. `tmp-deploy`) when the
 * cwd is the saflib repo itself so product/init and add-* do not upsert into
 * the golden {@link templatesDeployRoot}.
 */
export function getDeployDirName(): string {
  const override = process.env.SAF_DEPLOY_DIR?.trim();
  return override && override.length > 0 ? override : "deploy";
}

/** Absolute path to the active deploy tree under `cwd`. */
export function resolveDeployDir(cwd: string): string {
  return path.join(cwd, getDeployDirName());
}

/** Optional CI scaffold (`.github`) for new product monorepos. */
export const templatesScaffoldRoot = path.join(
  templatesPackageRoot,
  "scaffold",
);

/**
 * Golden domain offshoot stubs (db / spec / http / sdk / test).
 * Skipped by product/init (skipSourceGlobs for __…__ paths);
 * copied by domain offshoot init workflows.
 */
export const offshootStubRoot = path.join(
  templatesProductRoot,
  "__offshoot-name__",
);

/**
 * Golden npm-package shell for `monorepo/add-package` and related stubs
 * (exports, CLI, workflows, env). Destination path is chosen by the workflow
 * (prefer `<product>/lib/...`); this is only the source template.
 */
export const packageStubRoot = path.join(
  templatesProductRoot,
  "lib",
  "__package-name__",
);

/**
 * @deprecated Prefer {@link templatesProductRoot} — init now copies product,
 * deploy, and scaffold as separate roots.
 */
export const templatesCopyRoot = templatesProductRoot;

/** @deprecated Prefer {@link templatesProductRoot}. */
export const templatesRoot = templatesProductRoot;
