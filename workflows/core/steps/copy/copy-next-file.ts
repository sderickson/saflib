import path from "node:path";
import { fromPromise } from "xstate";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import { copyFile } from "node:fs/promises";
import { transformName } from "./utils.ts";
import type { CopyStepContext } from "./types.ts";
import { updateWorkflowAreas } from "./inline.ts";

export interface CopyNextFileOutput {
  skipped: boolean;
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
      skipped: false,
      fileName: targetFileName,
      fileId: currentFileId,
      filePath: targetPath,
      isDirectory,
    };

    if (runMode === "dry") {
      return response;
    }

    // Check if target file already exists
    try {
      await access(targetPath, constants.F_OK);
      const targetLines = (await readFile(targetPath, "utf-8")).split("\n");
      const sourceLines = (await readFile(sourcePath, "utf-8")).split("\n");
      updateWorkflowAreas({
        targetLines,
        targetPath,
        sourceLines,
        workflowId,
        lineReplace: lineReplace || ((line) => line),
      });
      response.skipped = true;
      return response;
    } catch {
      // File doesn't exist, proceed with copy
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
