import path from "node:path";
import { existsSync } from "node:fs";
import { makeLineReplace } from "@saflib/workflows";
import {
  kebabCaseToPascalCase,
  kebabCaseToSnakeCase,
} from "@saflib/utils";
import {
  templatesProductRoot,
  templatesDeployRoot,
  resolveDeployDir,
  getDeployDirName,
} from "@saflib/templates";

export const clientsRoot = path.join(templatesProductRoot, "clients");
export const linksStub = path.join(
  clientsRoot,
  "links",
  "__subdomain-name__-links.ts",
);
/** Upserts the subdomain-links workflow area into an existing links package. */
export const linksIndex = path.join(clientsRoot, "links", "index.ts");

export const devRoot = path.join(templatesProductRoot, "dev");
export const caddyDev = path.join(devRoot, "caddy-config", "Caddyfile");

/**
 * Deploy template tree at `saflib/deploy/` (`templatesDeployRoot`).
 */
export const deployTemplatesRoot = templatesDeployRoot;

export const deployProductCaddy = path.join(
  deployTemplatesRoot,
  "caddy",
  "__product-name__.Caddyfile",
);

/** Skip a step when the active deploy tree (see `SAF_DEPLOY_DIR`) is missing a path. */
export function skipIfMissingDeploy(...relParts: string[]) {
  return <C extends { cwd: string }>({ context }: { context: C }) =>
    !existsSync(path.join(resolveDeployDir(context.cwd), ...relParts));
}

export { resolveDeployDir, getDeployDirName };

/**
 * Append `value` to a `KEY=a,b,c` line if missing. Leaves other lines unchanged.
 * Preserves a leading empty slot (`,auth,...`) used for the root domain.
 */
export function appendCommaSeparatedEnvValue(
  content: string,
  key: string,
  value: string,
): string {
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
  const lineReplace = makeLineReplace(
    context as BasePackageLineReplaceContext & Record<string, unknown>,
  );
  const productPascal = kebabCaseToPascalCase(context.productName);
  const productSnake = kebabCaseToSnakeCase(context.productName);

  return (line: string) => {
    let out = line;
    out = out
      .split("@saflib/base-clients-common")
      .join(context.commonPackageName);
    out = out.split("@saflib/base-links").join(context.linksPackageName);
    if (context.serviceSdkName) {
      out = out.split("@saflib/base-sdk").join(context.serviceSdkName);
    }
    if (context.serviceSpecName) {
      out = out.split("@saflib/base-spec").join(context.serviceSpecName);
    }
    if (context.spaPackageName) {
      out = out
        .split("@saflib/base-__subdomain-name__-spa")
        .join(context.spaPackageName);
    }
    if (context.staticPackageName) {
      out = out
        .split("@saflib/base-__static-subdomain-name__-static")
        .join(context.staticPackageName);
    }
    out = out.split("DynamicBaseLayout").join(`Dynamic${productPascal}Layout`);
    out = out.split("BaseLayout").join(`${productPascal}Layout`);
    out = out
      .split("base_common_strings")
      .join(`${productSnake}_common_strings`);
    if (context.dockerImagePrefix) {
      out = out
        .split("saflib-base-")
        .join(`${context.dockerImagePrefix}-`);
      out = out.split("/app/base/").join(`/app/${context.productName}/`);
      out = out.split("./base/").join(`./${context.productName}/`);
      out = out
        .split("/srv/base-static-")
        .join(`/srv/${context.productName}-static-`);
      out = out
        .split("/base-static-")
        .join(`/${context.productName}-static-`);
    }
    return lineReplace(out);
  };
}
