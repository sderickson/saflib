import { exec } from "node:child_process";
import { promisify } from "node:util";
import path, { join } from "node:path";
import type { WorkflowContext } from "../types.ts";
import { handlePrompt } from "../prompt.ts";
import { writeFileSync, unlinkSync } from "fs";
import type { WorkflowDefinition } from "../types.ts";
const execAsync = promisify(exec);
import { checklistToString } from "../utils.ts";
import { tmpdir } from "os";
import { execSync } from "child_process";
import { getWorkflowLogger } from "../store.ts";
import { minimatch } from "minimatch";

let gitRoot: string | undefined;

export const getGitRoot = async () => {
  if (!gitRoot) {
    gitRoot = (
      await execAsync("git rev-parse --show-toplevel", {
        encoding: "utf8",
      })
    ).stdout.trim();
  }
  return gitRoot;
};

export const getGitChanges = async () => {
  const staged = (
    await execAsync("git diff --cached --name-only", {
      encoding: "utf8",
      cwd: await getGitRoot(),
    })
  ).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  // Get unstaged changes (modified files)
  const unstaged = (
    await execAsync("git diff --name-only", {
      encoding: "utf8",
      cwd: await getGitRoot(),
    })
  ).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  // Get untracked files
  const untracked = (
    await execAsync("git ls-files --others --exclude-standard", {
      cwd: await getGitRoot(),
      encoding: "utf8",
    })
  ).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  const allFiles = [...staged, ...unstaged, ...untracked];
  const gitRoot = await getGitRoot();
  const absoluteAllFiles = allFiles.map((file) => path.join(gitRoot, file));

  return absoluteAllFiles;
};

interface HandleGitChangesOptions {
  workflowId: string;
  context: WorkflowContext;
  checklistDescription: string;
  allowPaths?: string[];
}

export const handleGitChanges = async ({
  workflowId,
  context,
  checklistDescription,
  allowPaths,
}: HandleGitChangesOptions) => {
  let tries = 0;
  while (true) {
    const absoluteAllFiles = await getGitChanges();
    let otherFiles = filterMatches({
      absolutePaths: absoluteAllFiles,
      allowedAbsolutePaths: Object.values(context.copiedFiles || {}),
      allowedGlobs: allowPaths,
      cwd: context.cwd,
    });

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

      ****
      ${checklistDescription}
      ****
      
      If you have diverged from this goal, you need to undo the unscoped changes.`,
      });

      // bit of a hack to make sure "slowly printing" is done
      await new Promise((resolve) => setTimeout(resolve, 10));

      if (!shouldContinue || context.runMode === "script") {
        return false;
      }
    } else {
      return true;
    }
  }
};

export interface CommitChangesParam {
  workflow: WorkflowDefinition;
  context: WorkflowContext;
}

export const commitChanges = async (param: CommitChangesParam) => {
  const { workflow, context } = param;
  const logger = getWorkflowLogger();

  const absoluteAllFiles = await getGitChanges();
  if (absoluteAllFiles.length === 0) {
    logger.info("No files to commit. Skipping commit.");
    return;
  }

  await execAsync(`git add -A`, {
    cwd: await getGitRoot(),
  });

  const gitCommitHeader =
    workflow.checklistDescription?.(context) || workflow.description;
  const gitCommitBody = checklistToString(context.checklist);
  const gitCommitMessage = `${gitCommitHeader}\n\n${gitCommitBody}`;
  const msgFile = join(tmpdir(), `commit-msg-${Date.now()}.txt`);
  writeFileSync(msgFile, gitCommitMessage);
  execSync(`git commit -F "${msgFile}"`, {
    cwd: await getGitRoot(),
  });
  logger.info(`Committed ${absoluteAllFiles.length} files with message:
${gitCommitMessage}`);
  unlinkSync(msgFile);
};

interface FilterMatchesOptions {
  absolutePaths: string[];
  allowedAbsolutePaths: string[];
  allowedGlobs?: string[];
  cwd: string;
}

const universalGlobs = ["**/package-lock.json"];

export const filterMatches = ({
  absolutePaths,
  allowedAbsolutePaths,
  allowedGlobs: globs,
  cwd,
}: FilterMatchesOptions): string[] => {
  // filter out paths which are explicitly allowed
  const initialFilteredAbsolutePaths = absolutePaths.filter(
    (absolutePath) =>
      !allowedAbsolutePaths.some((allowedAbsolutePath) =>
        absolutePath.startsWith(allowedAbsolutePath),
      ),
  );

  const allGlobs = [...universalGlobs, ...(globs || [])];
  const absoluteGlobs = allGlobs.map((glob) => {
    return glob.startsWith("./") ? path.join(cwd, glob) : glob;
  });

  const filteredAbsolutePaths = initialFilteredAbsolutePaths.filter(
    (absolutePath) => {
      return !absoluteGlobs.some((glob) => minimatch(absolutePath, glob));
    },
  );

  return filteredAbsolutePaths;
};
