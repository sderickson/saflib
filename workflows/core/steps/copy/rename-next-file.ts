import { fromPromise } from "xstate";
import type { CopyStepContext } from "./types.ts";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
} from "../../../strings.ts";

export const renameNextFile = fromPromise(
  async ({ input }: { input: CopyStepContext }) => {
    const { name, filesToCopy, runMode, lineReplace, copiedFiles } = input;
    const currentFileId = filesToCopy[0];
    const targetPath = copiedFiles[currentFileId];
    const targetFileName = path.basename(targetPath);

    if (runMode === "dry") {
      return { fileName: targetFileName };
    }

    const stats = await stat(targetPath);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
      return { fileName: targetFileName };
    }

    const content = await readFile(targetPath, "utf-8");

    let updatedContent = content.split("\n");
    const snakeName = kebabCaseToSnakeCase(name);
    const pascalName = kebabCaseToPascalCase(name);
    const camelName = kebabCaseToCamelCase(name);
    try {
      for (var i = 0; i < updatedContent.length; i++) {
        if (updatedContent[i].includes("DELETE_THIS_LINE")) {
          updatedContent[i] = "";
          continue;
        }
        if (updatedContent[i].includes("/* do not replace */")) {
          updatedContent[i] = updatedContent[i].replace(
            "/* do not replace */",
            "",
          );
          continue;
        }

        if (lineReplace) {
          updatedContent[i] = lineReplace(updatedContent[i]);
        }
        updatedContent[i] = updatedContent[i].replace(/template-file/g, name);
        updatedContent[i] = updatedContent[i].replace(
          /template_file/g,
          snakeName,
        );
        updatedContent[i] = updatedContent[i].replace(
          /TemplateFile/g,
          pascalName,
        );
        updatedContent[i] = updatedContent[i].replace(
          /templateFile/g,
          camelName,
        );
        updatedContent[i] = updatedContent[i].replace(
          /TEMPLATE_FILE/g,
          snakeName.toUpperCase(),
        );
      }

      await writeFile(targetPath, updatedContent.join("\n"));

      return { fileName: targetFileName };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      console.error(
        `Failed to rename file ${targetFileName} in ${targetPath}: ${error.message}`,
      );
      throw error;
    }
  },
);
