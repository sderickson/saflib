import path from "node:path";
import { fromPromise } from "xstate";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import { copyFile } from "node:fs/promises";
import { transformName } from "./utils.ts";
import type { CopyStepContext } from "./types.ts";
import { updateWorkflowAreas, validateWorkflowAreas } from "./inline.ts";
import fs from "node:fs";

export interface CopyNextFileOutput {
  fileExisted: boolean;
  fileName: string;
  fileId: string;
  filePath: string;
  isDirectory: boolean;
}

export const copyNextFile = fromPromise(
  async ({
    input,
  }: {
    input: CopyStepContext;
  }): Promise<CopyNextFileOutput> => {
    const {
      filesToCopy,
      runMode,
      templateFiles,
      name,
      targetDir,
      lineReplace,
      sharedPrefix,
      workflowId,
    } = input;

    if (filesToCopy.length === 0) {
      throw new Error("No files to copy");
    }

    const currentFileId = filesToCopy[0];
    const sourcePath = templateFiles?.[currentFileId];
    if (!sourcePath) {
      throw new Error(`Template file ${currentFileId} not found`);
    }
    const relativePath = path.relative(sharedPrefix, sourcePath);

    let intermediaryDir = relativePath.includes("/")
      ? path.dirname(relativePath)
      : "";
    if (lineReplace) {
      intermediaryDir = lineReplace(intermediaryDir);
    }

    const targetFileName = transformName(
      path.basename(sourcePath),
      name,
      lineReplace,
    );
    const targetPath = path.join(targetDir, intermediaryDir, targetFileName);
    const stats = await stat(sourcePath);
    const isDirectory = stats.isDirectory();

    const response: CopyNextFileOutput = {
      fileExisted: false,
      fileName: targetFileName,
      fileId: currentFileId,
      filePath: targetPath,
      isDirectory,
    };

    // Check if target file already exists
    const fileExists = fs.existsSync(targetPath);
    if (fileExists) {      
      const targetContent = await readFile(targetPath, "utf-8");
      const targetLines = targetContent.split(/\r?\n/);
      const sourceContent = await readFile(sourcePath, "utf-8");
      const sourceLines = sourceContent.split(/\r?\n/);

      validateWorkflowAreas({
        sourceLines,
        targetLines,
        targetPath,
      });

      if (runMode === "dry") {
        return response;
      }

      const updatedLines = updateWorkflowAreas({
        targetLines,
        targetPath,
        sourceLines,
        workflowId,
        lineReplace: lineReplace || ((line) => line),
      });

      // Write the updated content back to the file
      const lineEnding = targetContent.includes("\r\n") ? "\r\n" : "\n";
      await writeFile(targetPath, updatedLines.join(lineEnding), "utf-8");

      response.fileExisted = true; // File was updated
      return response;
    }

    // Ensure target directory exists
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(path.dirname(targetPath), { recursive: true }),
    );

    if (isDirectory) {
      throw new Error("Directories should not be provided to copy-next-file.");
    } else {
      await copyFile(sourcePath, targetPath);
    }

    return response;
  },
);
