import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { WorkflowContext } from "../types.ts";
import { handlePrompt } from "../prompt.ts";
const execAsync = promisify(exec);

let gitRoot: string | undefined;

export const getGitRoot = async () => {
  if (!gitRoot) {
    gitRoot = (await execAsync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    })).stdout.trim();
  }
  return gitRoot;
};

export const getGitChanges = async () => {
  const staged = (await execAsync("git diff --cached --name-only", {
    encoding: "utf8",
    cwd: await getGitRoot(),
  })).stdout
    .trim()
    .split("\n")
    .filter(Boolean);
  
  // Get unstaged changes (modified files)
  const unstaged = (await execAsync("git diff --name-only", {
      encoding: "utf8",
    cwd: await getGitRoot(),
  })).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  // Get untracked files
  const untracked = (await execAsync("git ls-files --others --exclude-standard", {
    cwd: await getGitRoot(),
    encoding: "utf8",
  })).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  const allFiles = [...staged, ...unstaged, ...untracked];
  const gitRoot = await getGitRoot();
  const absoluteAllFiles = allFiles.map((file) => path.join(gitRoot, file));

  return absoluteAllFiles;
}


interface HandleGitChangesOptions {
  workflowId: string;
  context: WorkflowContext;
  checklistDescription: string;
  ignorePaths?: string[];
}

export const handleGitChanges = async ({
  workflowId,
  context,
  checklistDescription,
  ignorePaths,
}: HandleGitChangesOptions) => {
  let tries = 0;
  while (true) {
    const expectedFiles = new Set(Object.values(context.copiedFiles || {}));
    const absoluteAllFiles = await getGitChanges();
    let otherFiles = absoluteAllFiles
      .filter((file) => !expectedFiles.has(file))
      .filter((file) => !file.endsWith("package-lock.json"));
    if (ignorePaths) {
      const absoluteIgnorePaths = ignorePaths.map((ignorePath) =>
        path.join(context.cwd, ignorePath)
      );
      otherFiles = otherFiles.filter(
        (file) =>
          !absoluteIgnorePaths.some((ignorePath) => file.startsWith(ignorePath))
      );
    }

    if (otherFiles.length > 0) {
      tries++;
      if (tries > 3) {
        return false;
      }
      const { shouldContinue } = await handlePrompt({
        context: context,
        msg: `The following files had unexpected changes:
      ${otherFiles.map((file) => `- ${path.relative(context.cwd, file)}`).join("\n")}

      These are not expected to be changed by the workflow ${workflowId}.
      
      You need to do one of two things:
      - If these changes were NOT in service to the original prompt, undo them.
      - If these changes WERE in service of the original prompt, commit exactly these files with an explanatory message.
      
      Remember! The goal of this workflow is just to do the following:
      ${checklistDescription}.
      
      If you have diverged from this goal, you need to undo the unscoped changes.`,
      });

      // bit of a hack to make sure "slowly printing" is done
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (!shouldContinue || context.runMode === "script") {
        return false;
      }
    } else {
      return true;
    }
  }
};
