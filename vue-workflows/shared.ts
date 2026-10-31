import path from "node:path";
import { existsSync } from "node:fs";
import { makeLineReplace } from "@saflib/new-workflows";
import { kebabCaseToPascalCase, kebabCaseToSnakeCase } from "@saflib/utils";
import {
  templatesProductRoot,
} from "@saflib/templates";

export const clientsRoot = path.join(templatesProductRoot, "clients");
export const linksStub = path.join(clientsRoot, "links", "__subdomain-name__-links.ts");
/** Upserts the subdomain-links workflow area into an existing links package. */
export const linksIndex = path.join(clientsRoot, "links", "index.ts");

export const devRoot = path.join(templatesProductRoot, "dev");
export const caddyDev = path.join(devRoot, "caddy-config", "Caddyfile");

/**
 * The product's own deploy template (`base/product/deploy`): its edge routes
 * and web container. Older products without a per-product deploy skip these.
 */
export const productDeployTemplatesRoot = path.join(templatesProductRoot, "deploy");

/** The product's routes on the platform's edge. */
export const deployEdgeRoutes = path.join(productDeployTemplatesRoot, "remote-assets", "caddy", "__product-name__.Caddyfile");

/** The product web container's Caddyfile and image. */
export const deployWebCaddy = path.join(productDeployTemplatesRoot, "builds", "web", "Caddyfile");
export const deployWebDockerfile = path.join(productDeployTemplatesRoot, "builds", "web", "Dockerfile.template");

/** The product's deploy directory in the repo (`<product>/deploy`). */
export function productDeployDir(cwd: string, productName: string): string {
  return path.join(cwd, productName, "deploy");
}

/** Skip a step when the product's deploy (`<product>/deploy`) is missing a path. */
export function skipIfMissingProductDeploy(...relParts: string[]) {
  return <C extends { cwd: string; productName: string }>({ context }: { context: C }): boolean =>
    !existsSync(path.join(productDeployDir(context.cwd, context.productName), ...relParts));
}


/**
 * Append `value` to a `KEY=a,b,c` line if missing. Leaves other lines unchanged.
 * Preserves a leading empty slot (`,auth,...`) used for the root domain.
 */
export function appendCommaSeparatedEnvValue(content: string, key: string, value: string): string {
  const prefix = `${key}=`;
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (!trimmed.startsWith(prefix)) {
        return line;
      }
      const indent = line.slice(0, line.length - trimmed.length);
      const current = trimmed.slice(prefix.length);
      const tokens = current === "" ? [] : current.split(",");
      if (tokens.includes(value)) {
        return line;
      }
      return `${indent}${prefix}${current},${value}`;
    })
    .join("\n");
}

export type BasePackageLineReplaceContext = {
  productName: string;
  commonPackageName: string;
  linksPackageName: string;
  serviceSpecName?: string;
  serviceSdkName?: string;
  /** Remap `@saflib/base-__subdomain-name__-spa` → this package. */
  spaPackageName?: string;
  /** Remap `@saflib/base-__static-subdomain-name__-static` → this package. */
  staticPackageName?: string;
  /** Subdomain slug for static sites (replaces docker-safe `static-subdomain-name` token). */
  staticSubdomainName?: string;
  /**
   * Docker image prefix after init rewrite of `saflib-base`, e.g. `saflib-tmp`.
   * Also remaps `/app/base/`, `./base/`, and `/…/base-static-` path prefixes.
   */
  dockerImagePrefix?: string;
};

/**
 * Remap golden `@saflib/base-*` / `Base*` tokens onto the target product, then
 * apply standard `__placeholder__` interpolation via `makeLineReplace`.
 */
export function makeBasePackageLineReplace(
  context: BasePackageLineReplaceContext,
): (line: string) => string {
  const lineReplace = makeLineReplace(context as BasePackageLineReplaceContext & Record<string, unknown>);
  const productPascal = kebabCaseToPascalCase(context.productName);
  const productSnake = kebabCaseToSnakeCase(context.productName);

  return (line: string) => {
    let out = line;
    out = out.split("@saflib/base-clients-common").join(context.commonPackageName);
    out = out.split("@saflib/base-links").join(context.linksPackageName);
    if (context.serviceSdkName) {
      out = out.split("@saflib/base-sdk").join(context.serviceSdkName);
    }
    if (context.serviceSpecName) {
      out = out.split("@saflib/base-spec").join(context.serviceSpecName);
    }
    if (context.spaPackageName) {
      out = out.split("@saflib/base-__subdomain-name__-spa").join(context.spaPackageName);
    }
    if (context.staticPackageName) {
      out = out.split("@saflib/base-__static-subdomain-name__-static").join(context.staticPackageName);
    }
    out = out.split("DynamicBaseLayout").join(`Dynamic${productPascal}Layout`);
    out = out.split("BaseLayout").join(`${productPascal}Layout`);
    out = out.split("base_common_strings").join(`${productSnake}_common_strings`);
    if (context.dockerImagePrefix) {
      out = out.split("saflib-base-").join(`${context.dockerImagePrefix}-`);
      out = out.split("/app/base/").join(`/app/${context.productName}/`);
      out = out.split("./base/").join(`./${context.productName}/`);
      out = out.split("/srv/base-static-").join(`/srv/${context.productName}-static-`);
      out = out.split("/base-static-").join(`/${context.productName}-static-`);
    }
    // Interpolate `__static-subdomain-name__` (and other placeholders) first.
    // Docker image refs cannot use that form (invalid `_`-prefixed name), so
    // templates also use bare `static-subdomain-name`; replace those after so
    // we don't turn `__static-subdomain-name__` into `__docs__`.
    out = lineReplace(out);
    if ("staticSubdomainName" in context && context.staticSubdomainName) {
      out = out.split("static-subdomain-name").join(context.staticSubdomainName);
    }
    return out;
  };
}
