import path from "node:path";
import { fromPromise } from "xstate";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";
import { transformName } from "./utils.ts";
import type { CopyTemplateMachineContext } from "./types.ts";

interface CopyNextFileOutput {
  skipped: boolean;
  fileName: string;
  fileId: string;
  filePath: string;
}

export const copyNextFile = fromPromise(
  async ({
    input,
  }: {
    input: CopyTemplateMachineContext;
  }): Promise<CopyNextFileOutput> => {
    const { filesToCopy, dryRun, templateFiles, name, targetDir } = input;

    if (filesToCopy.length === 0) {
      throw new Error("No files to copy");
    }

    const currentFile = filesToCopy[0];
    const sourcePath = templateFiles?.[currentFile];
    if (!sourcePath) {
      throw new Error(`Template file ${currentFile} not found`);
    }
    const targetFileName = transformName(currentFile, name);
    const targetPath = path.join(targetDir, targetFileName);

    if (dryRun) {
      return {
        skipped: false,
        fileName: targetFileName,
        fileId: currentFile,
        filePath: targetPath,
      };
    }

    // Check if target file already exists
    try {
      await access(targetPath, constants.F_OK);
      return {
        skipped: true,
        fileName: targetFileName,
        fileId: currentFile,
        filePath: targetPath,
      };
    } catch {
      // File doesn't exist, proceed with copy
    }

    // Ensure target directory exists
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(path.dirname(targetPath), { recursive: true }),
    );

    await copyFile(sourcePath, targetPath);
    return {
      skipped: false,
      fileName: targetFileName,
      filePath: targetPath,
      fileId: currentFile,
    };
  },
);
