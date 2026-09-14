import node_path from "node:path";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import {
  camelCaseToKebabCase,
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
  camelCaseToTitleCase,
} from "./strings.ts";

/**
 * Mechanical port of `workflows/core/steps/copy/templating.ts`'s
 * `getPackageName`/`parsePackageName`/`parsePath`/`makeLineReplace` — pure
 * functions with no XState coupling, shared by every real (code-defined)
 * workflow that scaffolds into an existing package (`drizzle/add-query`,
 * `express/add-handler`, `openapi/add-route`, `sdk/add-*`, `vue/add-view`,
 * ...). No behavior changes from the original.
 */

export interface ParsePackageNameInput {
  /** Required suffix (e.g. "-db") to enforce on the package name. */
  requiredSuffix?: string | string[];
  /** Skip the suffix check (e.g. for checklist/example generation). */
  silentError?: boolean;
}

export interface ParsePackageNameOutput {
  /** Full package name, e.g. "@foobar/identity-db". */
  packageName: string;
  /** Service name without org or suffix, e.g. "identity". */
  serviceName: string;
  /** Org name, e.g. "foobar" or "". */
  organizationName: string;
  /** Prefix shared across a service's packages, e.g. "@foobar/identity". */
  sharedPackagePrefix: string;
}

/** Reads `name` out of `<cwd>/package.json`; "" if missing (dry/checklist runs). */
export function getPackageName(cwd: string): string {
  const packagePath = path.join(cwd, "package.json");
  if (!existsSync(packagePath)) {
    return "";
  }
  const result = readFileSync(packagePath, "utf8").match(/name": "(.+)"/)?.[1];
  if (!result) {
    throw new Error(`Package name not found in package.json in ${cwd}`);
  }
  return result;
}

/** Throws unless `<cwd>/package.json` depends on `dependencyName`. */
export function checkPackageDependency(cwd: string, dependencyName: string): void {
  const packageJson = readFileSync(path.join(cwd, "package.json"), "utf8");
  const dependencies = JSON.parse(packageJson).dependencies;
  if (!dependencies?.[dependencyName]) {
    throw new Error(`Package ${cwd} does not depend on ${dependencyName}`);
  }
}

/**
 * Breaks a package name `[@org/]service[-suffix]` into templating parts,
 * enforcing `requiredSuffix` if given.
 */
export function parsePackageName(
  packageName: string,
  input: ParsePackageNameInput = {},
): ParsePackageNameOutput {
  let usedSuffix = "";
  if (input.requiredSuffix) {
    const requiredSuffixes = Array.isArray(input.requiredSuffix)
      ? input.requiredSuffix
      : [input.requiredSuffix];
    if (!requiredSuffixes.some((suffix) => suffix.startsWith("-"))) {
      throw new Error(`Required suffix must start with -: ${input.requiredSuffix}`);
    }
    if (
      !requiredSuffixes.some((suffix) => packageName.endsWith(suffix)) &&
      !input.silentError
    ) {
      throw new Error(`Package name must end with ${requiredSuffixes.join(" or ")}`);
    }
    usedSuffix = requiredSuffixes.find((suffix) => packageName.endsWith(suffix)) || "";
  }
  const parts = packageName.replace(usedSuffix, "").split("/");
  let organizationName = "";
  let serviceName = "";
  let sharedPackagePrefix = "";
  if (parts.length === 1) {
    serviceName = parts[0];
    sharedPackagePrefix = serviceName;
  } else if (parts.length === 2) {
    organizationName = parts[0].replace("@", "");
    serviceName = parts[1];
    sharedPackagePrefix = "@" + organizationName + "/" + serviceName;
  } else {
    throw new Error(`Invalid package name: ${packageName}`);
  }
  if (input.requiredSuffix) {
    serviceName = serviceName.replace(usedSuffix, "");
  }
  return { packageName, serviceName, organizationName, sharedPackagePrefix };
}

export interface ParsePathInput {
  /** Required prefix (must start with "./"), stripped before parsing. */
  requiredPrefix?: string;
  /** Required suffix (must start with "."), stripped before parsing. */
  requiredSuffix?: string;
  /** Used to resolve `targetDir` as an absolute path. */
  cwd: string;
}

export interface ParsePathOutput {
  groupName: string;
  targetName: string;
  targetDir: string;
}

/**
 * Breaks `./[prefix/][group/]target[suffix]` into templating parts,
 * enforcing `requiredPrefix`/`requiredSuffix` if given.
 */
export function parsePath(rawPath: string, input: ParsePathInput): ParsePathOutput {
  if (input.requiredPrefix) {
    if (!input.requiredPrefix.startsWith("./")) {
      throw new Error(`Required prefix must start with ./. Given: "${input.requiredPrefix}"`);
    }
    if (!rawPath.startsWith(input.requiredPrefix)) {
      throw new Error(`Path must start with ${input.requiredPrefix}. Given: "${rawPath}"`);
    }
  }
  if (input.requiredSuffix) {
    if (!input.requiredSuffix.startsWith(".")) {
      throw new Error(`Required suffix must start with ".". Given: "${input.requiredSuffix}"`);
    }
    if (!rawPath.endsWith(input.requiredSuffix)) {
      throw new Error(`Path must end with ${input.requiredSuffix}. Given: "${rawPath}"`);
    }
  }
  const corePath = rawPath
    .replace(input.requiredPrefix || "", "")
    .replace(input.requiredSuffix || "", "");
  const parts = corePath.split("/");
  let groupName: string;
  let targetName: string;
  if (parts.length === 1) {
    targetName = parts[0];
    groupName = targetName;
  } else if (parts.length >= 2) {
    groupName = parts.slice(0, -1).join("/");
    targetName = parts[parts.length - 1];
  } else {
    throw new Error(`Invalid path: ${rawPath}`);
  }
  return {
    groupName,
    targetName,
    targetDir: node_path.dirname(node_path.join(input.cwd, rawPath)),
  };
}

/**
 * Builds a `lineReplace` function for `CopyStepInput` from a context
 * object (camelCase keys -> kebab-case-ish values): finds `__variables__`
 * (in kebab/snake/Pascal/camel/SNAKE case variants) and substitutes them.
 */
export function makeLineReplace(
  contextArg: object,
): (line: string) => string {
  const context = contextArg as Record<string, unknown>;
  const replaceMap: Record<string, string> = {};
  Object.keys(context).forEach((camelKey) => {
    const value = context[camelKey];
    if (typeof value !== "string") return;
    const kebabKey = camelCaseToKebabCase(camelKey);
    const snakeKey = kebabCaseToSnakeCase(kebabKey);
    const spaceKey = snakeKey.replace(/_/g, " ");
    const pascalKey = kebabCaseToPascalCase(kebabKey);
    replaceMap[`__${kebabKey}__`] = value;
    replaceMap[`__${camelKey}__`] = kebabCaseToCamelCase(value);
    replaceMap[`__${snakeKey}__`] = kebabCaseToSnakeCase(value);
    replaceMap[`__${pascalKey}__`] = kebabCaseToPascalCase(value);
    replaceMap[`__${snakeKey.toUpperCase()}__`] = kebabCaseToSnakeCase(value).toUpperCase();
    replaceMap[`__${camelCaseToTitleCase(spaceKey)}__`] = camelCaseToTitleCase(value);
  });
  const sharedPackagePrefix = context["sharedPackagePrefix"];
  const interpolationRegex = /__([A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*)__/g;
  return (line: string) => {
    let newLine = line;
    if (typeof sharedPackagePrefix === "string" && line.includes("template-package")) {
      newLine = newLine.replace("template-package", sharedPackagePrefix);
    }
    const matches = newLine.match(interpolationRegex);
    if (matches) {
      const unique = [...new Set(matches)].sort((a, b) => b.length - a.length);
      for (const match of unique) {
        if (replaceMap[match] === undefined) {
          throw new Error(`Missing replacement for ${match}`);
        }
        newLine = newLine.replaceAll(match, replaceMap[match]);
      }
    }
    return newLine;
  };
}
