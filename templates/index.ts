import path from "node:path";
import { fileURLToPath } from "node:url";

const templatesPackageRoot = path.dirname(fileURLToPath(import.meta.url));
const saflibRoot = path.resolve(templatesPackageRoot, "..");

/** Root of the `@saflib/templates` package (path helpers only). */
export { templatesPackageRoot };

/** Saflib monorepo root (parent of `base/`, `deploy/`, library packages). */
export const templatesSaflibRoot = saflibRoot;

/**
 * Golden product tree (`clients`, `service`, `dev`, `plans`).
 * product/init copies this to `<productName>/`.
 */
export const templatesProductRoot = path.join(saflibRoot, "base");

/** Deploy tree copied to `./deploy` by product/init. */
export const templatesDeployRoot = path.join(saflibRoot, "deploy");

/** Optional CI scaffold (`.github`) for new product monorepos. */
export const templatesScaffoldRoot = path.join(
  templatesPackageRoot,
  "scaffold",
);

/**
 * @deprecated Prefer {@link templatesProductRoot} — init now copies product,
 * deploy, and scaffold as separate roots.
 */
export const templatesCopyRoot = templatesProductRoot;

/** @deprecated Prefer {@link templatesProductRoot}. */
export const templatesRoot = templatesProductRoot;
