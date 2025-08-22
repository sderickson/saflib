import { fromPromise } from "xstate";
import type { CopyTemplateMachineContext } from "./types.ts";
import { readFile, writeFile } from "node:fs/promises";
import { transformName } from "./utils.ts";
import path from "node:path";
import { kebabCaseToSnakeCase } from "../utils.ts";
import { kebabCaseToPascalCase } from "../utils.ts";
import { kebabCaseToCamelCase } from "../utils.ts";

export const renameNextFile = fromPromise(
  async ({ input }: { input: CopyTemplateMachineContext }) => {
    const { targetDir, name, filesToCopy, dryRun } = input;

    const currentFile = filesToCopy[0];
    const targetFileName = transformName(currentFile, name);
    const targetPath = path.join(targetDir, targetFileName);

    if (dryRun) {
      return { fileName: targetFileName };
    }

    const content = await readFile(targetPath, "utf-8");

    let updatedContent = content;

    updatedContent = updatedContent.replace(/template-file/g, name);

    const snakeName = kebabCaseToSnakeCase(name);
    updatedContent = updatedContent.replace(/template_file/g, snakeName);

    const pascalName = kebabCaseToPascalCase(name);
    updatedContent = updatedContent.replace(/TemplateFile/g, pascalName);

    const camelName = kebabCaseToCamelCase(name);
    updatedContent = updatedContent.replace(/templateFile/g, camelName);

    await writeFile(targetPath, updatedContent);

    return { fileName: targetFileName };
  },
);
