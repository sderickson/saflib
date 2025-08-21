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

    // Read file content
    const content = await readFile(targetPath, "utf-8");

    // Replace content placeholders
    let updatedContent = content;

    // Replace kebab-case placeholders
    updatedContent = updatedContent.replace(/template-file/g, name);

    // Replace snake_case placeholders
    const snakeName = kebabCaseToSnakeCase(name);
    updatedContent = updatedContent.replace(/template_file/g, snakeName);

    // Replace PascalCase placeholders
    const pascalName = kebabCaseToPascalCase(name);
    updatedContent = updatedContent.replace(/TemplateFile/g, pascalName);

    // Replace camelCase placeholders
    const camelName = kebabCaseToCamelCase(name);
    updatedContent = updatedContent.replace(/templateFile/g, camelName);

    if (dryRun) {
      console.log("Dry run rename file", targetFileName);
      return { fileName: targetFileName };
    }

    // Write updated content back
    await writeFile(targetPath, updatedContent);

    return { fileName: targetFileName };
  },
);
