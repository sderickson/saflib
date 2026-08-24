import path from "node:path";
import { kebabCaseToPascalCase } from "../strings.ts";
import {
  getPackageName,
  parsePackageName,
  makeLineReplace,
} from "./steps/copy/templating.ts";

export type OffshootLayer = "db" | "spec" | "http" | "sdk";

export type OffshootInitContext = {
  offshootName: string;
  productName: string;
  packageName: string;
  sharedPackagePrefix: string;
  organizationName: string;
  serviceName: string;
  targetDir: string;
  parentDir: string;
  productRoot: string;
  /** Full npm name for the offshoot layer package being created. */
  offshootPackageName: string;
};

/** Parent weave host package.json — missing when scaffolding standalone saflib packages. */
export function parentLayerPackageJsonPath(parentDir: string): string {
  return path.join(parentDir, "package.json");
}

/**
 * Resolve offshoot scaffold paths.
 *
 * - `cwd` is usually the product root (e.g. `./tmp`).
 * - `parent` defaults to `./service/{layer}` (the weave host).
 * - Offshoot lands at `{product}/{offshootName}/{layer}`.
 */
export function resolveOffshootInitContext(opts: {
  cwd: string;
  offshootName: string;
  layer: OffshootLayer;
  parent?: string;
}): OffshootInitContext {
  const offshootName = opts.offshootName;
  const parentDir = path.resolve(
    opts.cwd,
    opts.parent ?? path.join("service", opts.layer),
  );
  const productRoot = path.dirname(path.dirname(parentDir));
  const targetDir = path.join(productRoot, offshootName, opts.layer);

  const parentPkg = getPackageName(parentDir);
  const suffix = `-${opts.layer}`;
  const parsed = parsePackageName(parentPkg, {
    requiredSuffix: suffix,
    silentError: true,
  });

  // Parent `@org/product-db` → product `product`. Fallback: dirname of product root.
  const productName =
    parsed.serviceName && parsed.serviceName.length > 0
      ? parsed.serviceName
      : path.basename(productRoot);

  const organizationName =
    parsed.organizationName ||
    parsePackageName(getPackageName(opts.cwd), { silentError: true })
      .organizationName ||
    "saflib";

  const sharedPackagePrefix = `@${organizationName}/${productName}`;
  const offshootPackageName = `${sharedPackagePrefix}-${offshootName}-${opts.layer}`;

  return {
    offshootName,
    productName,
    packageName: offshootPackageName,
    sharedPackagePrefix,
    organizationName,
    serviceName: productName,
    targetDir,
    parentDir,
    productRoot,
    offshootPackageName,
  };
}

/**
 * Remap golden `@saflib/base-__offshoot-name__-*` / `Base*` tokens onto the
 * target product + offshoot, then apply `__placeholder__` interpolation.
 */
export function makeOffshootLineReplace(context: OffshootInitContext) {
  const placeholderReplace = makeLineReplace(context);
  const productPascal = kebabCaseToPascalCase(context.productName);
  const offshootPascal = kebabCaseToPascalCase(context.offshootName);

  return (line: string) => {
    let out = line;
    // Package names before placeholder replace (tokens still present).
    out = out
      .split("@saflib/base-__offshoot-name__-db")
      .join(`${context.sharedPackagePrefix}-${context.offshootName}-db`);
    out = out
      .split("@saflib/base-__offshoot-name__-spec")
      .join(`${context.sharedPackagePrefix}-${context.offshootName}-spec`);
    out = out
      .split("@saflib/base-__offshoot-name__-http")
      .join(`${context.sharedPackagePrefix}-${context.offshootName}-http`);
    out = out
      .split("@saflib/base-__offshoot-name__-sdk")
      .join(`${context.sharedPackagePrefix}-${context.offshootName}-sdk`);
    // Sibling / parent layer refs inside offshoot packages.
    out = out
      .split("@saflib/base-db")
      .join(`${context.sharedPackagePrefix}-db`);
    out = out
      .split("@saflib/base-spec")
      .join(`${context.sharedPackagePrefix}-spec`);
    out = out
      .split("@saflib/base-service-common")
      .join(`${context.sharedPackagePrefix}-service-common`);
    out = out
      .split("@saflib/base-sdk")
      .join(`${context.sharedPackagePrefix}-sdk`);
    // Base__OffshootName__X → ProductOffshootX (before __OffshootName__ alone).
    out = out
      .split("Base__OffshootName__")
      .join(`${productPascal}${offshootPascal}`);
    return placeholderReplace(out);
  };
}
