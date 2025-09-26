import node_path from "node:path";
import {
  camelCaseToKebabCase,
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
} from "../../../strings.ts";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface ParsePackageNameInput {
  requiredSuffix?: string | string[]; // e.g. "-db"
}

export interface ParsePackageNameOutput {
  packageName: string; // e.g. "@foobar/identity-db"
  serviceName: string; // e.g. "identity"
  organizationName: string; // e.g. "foobar" or ""
  sharedPackagePrefix: string; // e.g. "@foobar/identity"
}

export const getPackageName = (cwd: string): string => {
  const result = readFileSync(path.join(cwd, "package.json"), "utf8").match(
    /name": "(.+)"/,
  )?.[1];
  if (!result) {
    throw new Error(`Package name not found in package.json in ${cwd}`);
  }
  return result;
};

/**
 * Takes a package name and returns a breakdown based on conventions.
 *
 * The package name format is [@organization-name/]service-name[-required-suffix].
 * If provided a required suffix, this function will enforce that the name ends with it.
 */
export const parsePackageName = (
  packageName: string,
  input?: ParsePackageNameInput,
): ParsePackageNameOutput => {
  input = input || {};
  let usedSuffix = "";
  if (input.requiredSuffix) {
    const requiredSuffixes = Array.isArray(input.requiredSuffix)
      ? input.requiredSuffix
      : [input.requiredSuffix];
    if (!requiredSuffixes.some((suffix) => suffix.startsWith("-"))) {
      throw new Error(
        `Required suffix must start with -: ${input.requiredSuffix}`,
      );
    }
    if (
      !requiredSuffixes.some((suffix) => packageName.endsWith(suffix)) &&
      process.env.NODE_ENV !== "test"
    ) {
      throw new Error(
        `Package name must end with ${requiredSuffixes.join(" or ")}`,
      );
    }
    usedSuffix =
      requiredSuffixes.find((suffix) => packageName.endsWith(suffix)) || "";
  }
  const parts = packageName.replace(usedSuffix, "").split("/");
  let organizationName = "";
  let serviceName = "";
  let sharedPackagePrefix = "";
  if (parts.length === 1) {
    serviceName = parts[0];
    sharedPackagePrefix = serviceName;
  } else if (parts.length === 2) {
    organizationName = parts[0];
    serviceName = parts[1];
    sharedPackagePrefix = organizationName + "/" + serviceName;
  } else {
    throw new Error(`Invalid package name: ${packageName}`);
  }
  if (input.requiredSuffix) {
    serviceName = serviceName.replace(usedSuffix, "");
  }
  return {
    packageName,
    serviceName,
    organizationName,
    sharedPackagePrefix,
  };
};

export interface ParsePathInput {
  requiredPrefix?: string; // e.g. "queries/"
  requiredSuffix?: string; // e.g. ".ts"
  cwd: string; // e.g. "/<abs-path>"
}

export interface ParsePathOutput {
  groupName: string; // e.g. "contacts"
  targetName: string; // e.g. "get-by-id"
  targetDir: string; // e.g. "/<abs-path>/queries/contacts"
}

/**
 * Takes a target path to a file and breaks it down into conventional parts.
 *
 * The path format is "./[required-prefix/][group-name/]target-name[required-suffix]".
 * This function will enforce required prefixes and suffixes. The suffix will usually just be a file extension.
 * To resolve the absolute path to the target directory, a cwd is required.
 */
export const parsePath = (
  path: string,
  input: ParsePathInput,
): ParsePathOutput => {
  if (input.requiredPrefix) {
    if (!input.requiredPrefix.startsWith("./")) {
      throw new Error(
        `Required prefix must start with ./: ${input.requiredPrefix}`,
      );
    }
    if (!path.startsWith(input.requiredPrefix)) {
      throw new Error(`Path must start with ${input.requiredPrefix}`);
    }
  }
  if (input.requiredSuffix) {
    if (!input.requiredSuffix.startsWith(".")) {
      throw new Error(
        `Required suffix must start with .: ${input.requiredSuffix}`,
      );
    }
    if (!path.endsWith(input.requiredSuffix)) {
      throw new Error(`Path must end with ${input.requiredSuffix}`);
    }
  }
  let corePath = path
    .replace(input.requiredPrefix || "", "")
    .replace(input.requiredSuffix || "", "");
  const parts = corePath.split("/");
  let groupName = "";
  let targetName = "";
  if (parts.length === 1) {
    targetName = parts[0];
    groupName = targetName; // for workflows that set up the group
  } else if (parts.length === 2) {
    groupName = parts[0];
    targetName = parts[1];
  } else {
    throw new Error(`Invalid path: ${path}`);
  }

  return {
    groupName,
    targetName,
    targetDir: node_path.dirname(node_path.join(input.cwd, path)),
  };
};

/**
 * Creates a line-replace function which will handle template interpolation, given a context.
 * The context is an object of camelCase keys to kebab-case values. It looks for __variables__ and replaces them with the given context values.
 * It will automatically handle variant names, such as __kebab-case__, __snake_case__, __PascalCase__, __camelCase__, and __SNAKE_CASE__,
 * so you provide one variant of the string and it will automatically convert keys and values with the appropriate casing and connecting characters.
 */
export const makeLineReplace = (context: { [key: string]: any }) => {
  const replaceMap: Record<string, string> = {};
  // expect keys to be camelCase
  Object.keys(context).forEach((camelKey) => {
    if (typeof context[camelKey] !== "string") {
      return;
    }
    const kebabKey = camelCaseToKebabCase(camelKey);
    const snakeKey = kebabCaseToSnakeCase(kebabKey);
    const pascalKey = kebabCaseToPascalCase(kebabKey);
    replaceMap[`__${kebabKey}__`] = context[camelKey];
    replaceMap[`__${camelKey}__`] = kebabCaseToCamelCase(context[camelKey]);
    replaceMap[`__${snakeKey}__`] = kebabCaseToSnakeCase(context[camelKey]);
    replaceMap[`__${pascalKey}__`] = kebabCaseToPascalCase(context[camelKey]);
    replaceMap[`__${snakeKey.toUpperCase()}__`] = kebabCaseToSnakeCase(
      context[camelKey],
    ).toUpperCase();
  });
  if (context["sharedPackagePrefix"]) {
    // special case, because npm doesn't allow package names to start with an underscore
    replaceMap[`template-package`] = context["sharedPackagePrefix"];
  }
  const interpolationRegex = /__(.+?)__/g;
  return (line: string) => {
    let newLine = line;
    if (line.includes("template-package") && context["sharedPackagePrefix"]) {
      newLine = line.replace(
        "template-package",
        context["sharedPackagePrefix"],
      );
    }
    const matches = line.match(interpolationRegex);
    if (matches) {
      matches.forEach((match) => {
        if (!replaceMap[match]) {
          if (process.env.NODE_ENV !== "test") {
            console.error(`Match "${match}" not found in line \`${line}\``);
            console.error("replaceMap:", JSON.stringify(replaceMap, null, 2));
          }
          throw new Error(`Missing replacement for ${match}`);
        }
        newLine = newLine.replaceAll(match, replaceMap[match]);
        // console.log(`Before/after replace:\n  ${line}\n  -> ${newLine}`);
      });
    }
    return newLine;
  };
};
