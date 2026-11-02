/**
 * Shared by both product/init workflows (the new engine's in ./init.ts, and the
 * legacy XState one in @saflib/product, until that's removed): the line
 * replacement that turns the golden base/product (and base/platform) into a
 * product, and the post-copy scripts in this directory.
 */
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  makeLineReplace,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { kebabCaseToPascalCase, kebabCaseToSnakeCase } from "@saflib/utils";
import { getDeployDirName } from "@saflib/templates";

/** Directory of the post-copy scripts (fix-product-relative-paths.ts, …). */
export const productScriptsDir = import.meta.dirname;

/** `__product-name__` in any case variant: the product's own files, kept. */
const PRODUCT_PLACEHOLDER = /^__(product-name|productName|product_name|ProductName|PRODUCT_NAME)__/;

/**
 * Skip golden expansion stubs (`__subdomain-name__/…`, `__TargetName__.vue`, …)
 * when copying a product: any path segment starting with a placeholder other
 * than the product name. Product-named files (`caddy/__product-name__.Caddyfile`)
 * are copied and renamed. Also skips the golden product's own docs.
 */
export function skipGoldenStubPath(fullPath: string): boolean {
  const segments = fullPath.split(path.sep);
  if (segments.join("/").includes("/base/product/docs/")) return true;
  return segments.some((segment) => /^__[A-Za-z]/.test(segment) && !PRODUCT_PLACEHOLDER.test(segment));
}

/**
 * Walk up from `start` and return the outermost directory whose package.json
 * declares `workspaces`. Nested installs (e.g. saflib inside a host monorepo) must
 * run `npm install` at that root so new product packages get linked.
 */
export function findOutermostWorkspaceRoot(start: string): string {
  let dir = path.resolve(start);
  let found = dir;
  while (true) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
          found = dir;
        }
      } catch {
        // ignore invalid package.json
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return found;
}

export interface InitProductWorkflowContext extends ParsePackageNameOutput {
  productName: string;
  domainName: string;
  /** `domainName` escaped for a regex (`__escaped-domain-name__`, e.g. in CORS patterns). */
  escapedDomainName: string;
  productOnly: boolean;
  /** True when init cwd is a product root with a nested `saflib/` workspace. */
  embeddedProductMonorepo: boolean;
  /** The repo already has a platform deploy (edge + Kratos); only add the product. */
  platformExists: boolean;
}

/** Frozen golden-product name under saflib (`saflib/base`). */
const SOURCE_PRODUCT_NAME = "base";
const SOURCE_PACKAGE_PREFIX = `@saflib/${SOURCE_PRODUCT_NAME}`;
const SOURCE_DOMAIN = "example.com";

/**
 * Adapt the golden dev compose files from the saflib-root layout to the
 * product-beside-saflib one. The `../..:/app` mounts stay (that's the product
 * monorepo root, with saflib under it), but saflib's own tooling and its
 * standalone node_modules now live under /app/saflib. Also point the site
 * Dockerfile at `saflib/dev-site/...` and drop a hardcoded DEV_SITE_STATIC_DIR
 * so the image ENV from `saf-docker generate` wins.
 */
export function toProductMonorepoDevCompose(content: string): string {
  let out = content.replace(
    /\/app\/docker\/dev\/install-node-modules\.ts/g,
    "/app/saflib/docker/dev/install-node-modules.ts",
  );
  // saflib/node_modules is for developing saflib standalone; mask it so
  // neither the container nor the host sees the other's install.
  out = out.replace(
    /^([ \t]*)- node_modules:\/app\/node_modules\n/gm,
    "$&$1- saflib_node_modules:/app/saflib/node_modules\n",
  );
  out = out.replace(
    /^(  node_modules:\n    name: ([^\n]*)-node-modules\n)/m,
    "$1  saflib_node_modules:\n    name: $2-saflib-node-modules\n",
  );
  out = out.replace(
    /(dockerfile:\s*)dev-site\/dev-site-docker\/Dockerfile/g,
    "$1saflib/dev-site/dev-site-docker/Dockerfile",
  );
  out = out.replace(
    /^[ \t]*DEV_SITE_STATIC_DIR:[^\n]*\n/gm,
    "",
  );
  return out;
}

/**
 * Live-host lines that still point at expansion stubs skipped by
 * skipSourceGlobs (paths matching __stub-name__). Dropping them keeps
 * package.json / tsconfig / schema barrels valid after stub packages/files
 * themselves are omitted.
 */
export function isSkippedStubRefLine(line: string): boolean {
  if (!/__[a-zA-Z][a-zA-Z0-9_-]*__/.test(line)) return false;
  // package.json dependency on a skipped stub package
  if (/^\s*"@[^"]*__[^"]*"\s*:/.test(line)) return true;
  // tsconfig project reference (single- or multi-line `"path"` entry)
  if (/"path"\s*:\s*"[^"]*__[^"]*"/.test(line)) return true;
  if (/^\s*\{\s*"path"\s*:\s*"[^"]*__[^"]*"\s*\}\s*,?\s*$/.test(line)) {
    return true;
  }
  // JS/TS import/export of skipped stub modules (e.g. schemas/__group-name__.ts).
  // Require `from` so Caddy `import __product-name__.Caddyfile` is not dropped.
  if (
    /^\s*(export|import)\b/.test(line) &&
    /\bfrom\s+['"][^'"]*__[^'"]*['"]/.test(line)
  ) {
    return true;
  }
  return false;
}

export function makeProductInitLineReplace(context: InitProductWorkflowContext) {
  const placeholderReplace = makeLineReplace(context);
  const dockerFrom = `saflib-${SOURCE_PRODUCT_NAME}`;
  const dockerTo = `${context.organizationName}-${context.productName}`;
  const pascal = kebabCaseToPascalCase(context.productName);
  const snakeUpper = kebabCaseToSnakeCase(context.productName).toUpperCase();
  const sourcePascal = kebabCaseToPascalCase(SOURCE_PRODUCT_NAME);
  const sourceSnakeUpper =
    kebabCaseToSnakeCase(SOURCE_PRODUCT_NAME).toUpperCase();

  return (line: string) => {
    // Drop the co-located SPA stub from CLIENT_SUBDOMAINS before placeholder
    // replace (init has no subdomainName; add-spa appends real names later).
    let prepared = line;
    if (/^\s*CLIENT_SUBDOMAINS=/.test(prepared)) {
      prepared = prepared.replace(/,__subdomain-name__/g, "");
    }

    // Vite define — looks like a placeholder but is a framework constant.
    if (prepared.includes("__VUE_PROD_DEVTOOLS__")) {
      return finishProductInitLineReplace(prepared, context, {
        dockerFrom,
        dockerTo,
        pascal,
        snakeUpper,
        sourcePascal,
        sourceSnakeUpper,
      });
    }

    if (isSkippedStubRefLine(prepared)) {
      return "";
    }

    // Generated Dockerfiles list stub package paths for base's own builds;
    // drop segments whose placeholders are unknown to this context so
    // makeLineReplace does not warn — but keep paths that only use known
    // tokens (e.g. __product-name__) so they can be interpolated.
    if (/^\s*COPY\b/.test(prepared)) {
      prepared = prepared
        .split(/\s+/)
        .filter((tok) => {
          if (!/__[a-zA-Z][a-zA-Z0-9_-]*__/.test(tok)) return true;
          try {
            placeholderReplace(tok);
            return true;
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.startsWith("Missing replacement")
            ) {
              return false;
            }
            throw error;
          }
        })
        .join(" ");
      // Stub-only COPY lines can collapse to `COPY` / `COPY --from=…` with no
      // sources left — drop them rather than emitting invalid Dockerfiles.
      if (/^\s*COPY(?:\s+--\S+)*\s*$/.test(prepared)) {
        return "";
      }
    }

    // Unknown __tokens__ in comments / SQL stay literal when not dropped above —
    // product/init has no integrationName/groupName/etc. Stub migrations are
    // wiped and regenerated after install (see reset-product-db-migrations).
    let out: string;
    try {
      out = placeholderReplace(prepared);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Missing replacement")
      ) {
        out = prepared;
      } else {
        throw error;
      }
    }

    return finishProductInitLineReplace(out, context, {
      dockerFrom,
      dockerTo,
      pascal,
      snakeUpper,
      sourcePascal,
      sourceSnakeUpper,
    });
  };
}

const TSCONFIG_PRESET_FILENAMES = [
  "tsconfig.app.base.json",
  "tsconfig.base.json",
] as const;

/** Literals that contain `base-` / bare `base` but are not the golden product name. */
const NON_PRODUCT_BASE_LITERALS = ["base-uri", ...TSCONFIG_PRESET_FILENAMES] as const;

/** Keep shared tsconfig preset names and CSP `base-uri` literal when renaming. */
function protectNonProductBaseLiterals(line: string): string {
  let result = line;
  for (const literal of NON_PRODUCT_BASE_LITERALS) {
    result = result.replaceAll(literal, `__SAF_${literal.replaceAll(".", "_").replaceAll("-", "_")}__`);
  }
  return result;
}

function restoreNonProductBaseLiterals(line: string): string {
  let result = line;
  for (const literal of NON_PRODUCT_BASE_LITERALS) {
    result = result.replaceAll(
      `__SAF_${literal.replaceAll(".", "_").replaceAll("-", "_")}__`,
      literal,
    );
  }
  return result;
}

function finishProductInitLineReplace(
  out: string,
  context: InitProductWorkflowContext,
  names: {
    dockerFrom: string;
    dockerTo: string;
    pascal: string;
    snakeUpper: string;
    sourcePascal: string;
    sourceSnakeUpper: string;
  },
): string {
  const {
    dockerFrom,
    dockerTo,
    pascal,
    snakeUpper,
    sourcePascal,
    sourceSnakeUpper,
  } = names;

  const prepared = protectNonProductBaseLiterals(out);

  // Preserve the thin @saflib/templates package name / path (do not treat
  // "templates" lines as exempt from /base/ → /product/ path renames —
  // monolith Dockerfiles mention both).
  const preserveTemplates =
    prepared.includes("@saflib/templates") ||
    prepared.includes("saflib/templates/");

  let result = preserveTemplates
    ? prepared
    : prepared.split(SOURCE_PACKAGE_PREFIX).join(context.sharedPackagePrefix);
  // Only the deploy package itself — not e.g. `@saflib/deploy-cli`.
  result = result.replace(
    /@saflib\/deploy(?![\w-])/g,
    `@${context.organizationName}/deploy`,
  );
  result = result.split(dockerFrom).join(dockerTo);
  result = result.split(SOURCE_DOMAIN).join(context.domainName);

  // Golden templates: base/platform → the repo's platform deploy dir, and
  // base/product → the product.
  result = result.replace(
    /(?<![\w.@])base\/platform(?![\w-])/g,
    getDeployDirName(),
  );
  result = result.replace(
    new RegExp(`(?<![\\w.@])${SOURCE_PRODUCT_NAME}/product(?![\\w-])`, "g"),
    context.productName,
  );

  // Path / token renames — avoid bare "base" (database, based, …).
  result = result.replaceAll(
    `/${SOURCE_PRODUCT_NAME}/`,
    `/${context.productName}/`,
  );
  result = result.replaceAll(
    `./${SOURCE_PRODUCT_NAME}/`,
    `./${context.productName}/`,
  );
  result = result.replaceAll(
    `${SOURCE_PRODUCT_NAME}-`,
    `${context.productName}-`,
  );
  result = result.replaceAll(
    `/${SOURCE_PRODUCT_NAME}-`,
    `/${context.productName}-`,
  );
  result = result.replaceAll(`${sourceSnakeUpper}_`, `${snakeUpper}_`);
  result = result.replaceAll(sourcePascal, pascal);

  result = result.replace(
    new RegExp(`\\b${SOURCE_PRODUCT_NAME}\\b`, "g"),
    context.productName,
  );
  result = result.replace(
    new RegExp(`\\b${sourceSnakeUpper}\\b`, "g"),
    snakeUpper,
  );

  result = restoreNonProductBaseLiterals(result);
  return result;
}

