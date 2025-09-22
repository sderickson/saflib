import { setup, assign } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  logError,
  logWarn,
} from "../../xstate.ts";
import { copyNextFile } from "./copy-next-file.ts";
import { renameNextFile } from "./rename-next-file.ts";
import type { WorkflowOutput, WorkflowInput } from "../../types.ts";
import { contextFromInput } from "../../utils.ts";
import node_path from "node:path";
import type { CopyStepContext, CopyStepInput } from "./types.ts";
import { parseChecklist, parseCopiedFiles } from "./helpers.ts";
import {
  camelCaseToKebabCase,
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
} from "../../../strings.ts";
import { readFileSync } from "node:fs";
import path from "node:path";

export type { CopyStepInput };

export interface ParsePackageNameInput {
  requiredSuffix?: string; // e.g. "-db"
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

export const parsePackageName = (
  packageName: string,
  input: ParsePackageNameInput,
): ParsePackageNameOutput => {
  if (input.requiredSuffix) {
    if (!input.requiredSuffix.startsWith("-")) {
      throw new Error(
        `Required suffix must start with -: ${input.requiredSuffix}`,
      );
    }
    if (!packageName.endsWith(input.requiredSuffix)) {
      throw new Error(`Package name must end with ${input.requiredSuffix}`);
    }
  }
  const parts = packageName.replace(input.requiredSuffix || "", "").split("/");
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
    serviceName = serviceName.replace(input.requiredSuffix, "");
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
          console.error(`Match "${match}" not found in line \`${line}\``);
          console.error("replaceMap:", JSON.stringify(replaceMap, null, 2));
          throw new Error(`Missing replacement for ${match}`);
        }
        newLine = newLine.replaceAll(match, replaceMap[match]);
        // console.log(`Before/after replace:\n  ${line}\n  -> ${newLine}`);
      });
    }
    return newLine;
  };
};

/**
 * Copies all `templateFiles` to the given directory, renaming all instances of `"template-file"` to the given `name`. Also replaces other variants of the string: camelCase, snake_case, and PascalCase.
 */
export const CopyStepMachine = setup({
  types: {
    input: {} as CopyStepInput & WorkflowInput,
    context: {} as CopyStepContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    copyNextFile,
    renameNextFile,
    ...workflowActors,
  },
  guards: {
    hasMoreFiles: ({ context }) => {
      return context.filesToCopy.length > 0;
    },
    skipped: ({ event }) => event.output.skipped,
    wasDirectory: ({ event }) => event.output.isDirectory,
  },
}).createMachine({
  id: "copy-template",
  description: "Copy template files and rename placeholders",
  initial: "copy",
  context: ({ input, self }) => {
    if (!input.templateFiles) {
      throw new Error("templateFiles is required");
    }
    return {
      ...contextFromInput(input, self),
      filesToCopy: Object.keys(input.templateFiles || {}),
      name: input.name,
      targetDir: input.targetDir,
      copiedFiles: input.copiedFiles || {},
      lineReplace: input.lineReplace,
    };
  },
  states: {
    copy: {
      invoke: {
        input: ({ context }) => {
          return context;
        },
        src: "copyNextFile",
        onDone: [
          {
            guard: "skipped",
            target: "popFile",
            actions: [
              logWarn(
                ({ event }) =>
                  `File ${event.output.fileName} already exists, skipping`,
              ),
              assign({
                checklist: parseChecklist,
                copiedFiles: parseCopiedFiles,
              }),
            ],
          },
          {
            guard: "wasDirectory",
            target: "popFile",
            actions: [
              logWarn(
                ({ event }) =>
                  `Warning: ${event.output.fileName} is a directory, did not rename`,
              ),
              assign({
                checklist: parseChecklist,
                copiedFiles: parseCopiedFiles,
              }),
            ],
          },
          {
            target: "rename",
            actions: [
              assign({
                checklist: parseChecklist,
                copiedFiles: parseCopiedFiles,
              }),
            ],
          },
        ],
      },
    },
    rename: {
      entry: [
        logInfo(
          ({ event }) => `Generated "${event.output.fileName}" from template`,
        ),
      ],
      invoke: {
        input: ({ context }) => context,
        src: "renameNextFile",
        onDone: {
          target: "popFile",
        },
      },
    },
    popFile: {
      entry: [
        assign(({ context }) => ({
          filesToCopy: context.filesToCopy.slice(1),
        })),
      ],
      always: [
        {
          guard: "hasMoreFiles",
          target: "copy",
        },
        {
          target: "done",
        },
      ],
    },
    done: {
      actions: [logInfo("Template files copied and renamed successfully.")],
      type: "final",
      entry: logInfo("Template copy workflow completed successfully"),
    },
    error: {
      type: "final",
      entry: logError("Template copy workflow failed"),
    },
  },
  output: ({ context }) => {
    return {
      checklist: {
        description: `Copy template files and rename placeholders.`,
        subitems: context.checklist,
      },
      copiedFiles: context.copiedFiles,
    };
  },
});
