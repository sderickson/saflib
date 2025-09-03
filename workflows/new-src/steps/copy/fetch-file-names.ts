import { fromPromise } from "xstate";
import type { CopyTemplateMachineContext } from "./types.ts";
import { readdir } from "node:fs/promises";

export const fetchFileNames = fromPromise(
  async ({ input }: { input: CopyTemplateMachineContext }) => {
    const { sourceDir, targetDir } = input;

    let sourceFiles: string[] = [];
    let targetFiles: string[] = [];

    try {
      sourceFiles = await readdir(sourceDir);
    } catch (error) {
      throw new Error(
        `Failed to read source folder: ${(error as Error).message}`,
      );
    }

    try {
      targetFiles = await readdir(targetDir);
    } catch (error) {
      // Target folder might not exist, that's okay
      targetFiles = [];
    }

    return { sourceFiles, targetFiles };
  },
);
