import path from "node:path";
import { fromPromise } from "xstate";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";
import { transformName } from "./utils.ts";
import type { CopyStepContext } from "./types.ts";

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
    input: CopyStepContext;
  }): Promise<CopyNextFileOutput> => {
    const { filesToCopy, dryRun, templateFiles, name, targetDir } = input;

    if (filesToCopy.length === 0) {
      throw new Error("No files to copy");
    }

    const currentFileId = filesToCopy[0];
    const sourcePath = templateFiles?.[currentFileId];
    if (!sourcePath) {
      throw new Error(`Template file ${currentFileId} not found`);
    }
    const targetFileName = transformName(path.basename(sourcePath), name);
    const targetPath = path.join(targetDir, targetFileName);

    const response: CopyNextFileOutput = {
      skipped: false,
      fileName: targetFileName,
      fileId: currentFileId,
      filePath: targetPath,
    };

    if (dryRun) {
      return response;
    }

    // Check if target file already exists
    try {
      await access(targetPath, constants.F_OK);
      response.skipped = true;
      return response;
    } catch {
      // File doesn't exist, proceed with copy
    }

    // Ensure target directory exists
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(path.dirname(targetPath), { recursive: true }),
    );

    await copyFile(sourcePath, targetPath);
    return response;
  },
);
