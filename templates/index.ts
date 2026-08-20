import path from "node:path";
import { fileURLToPath } from "node:url";

/** Root of the `@saflib/templates` package. */
export const templatesPackageRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Copy source that mirrors a product monorepo layout:
 * `deploy/`, `__product-name__/`, optional root `package.json`, `.github/`.
 */
export const templatesCopyRoot = path.join(templatesPackageRoot, "templates");

/** Product subtree inside the copy source (`clients`, `service`, `dev`, …). */
export const templatesProductRoot = path.join(
  templatesCopyRoot,
  "__product-name__",
);

/** @deprecated Prefer {@link templatesCopyRoot}. */
export const templatesRoot = templatesCopyRoot;
