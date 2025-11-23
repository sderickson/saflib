import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import type { MonorepoContext } from "../../src/workspace.ts";

export interface GenerateWorkflowDocsOptions {
  packageName: string;
  monorepoContext: MonorepoContext;
}

export function generateWorkflowDocs(options: GenerateWorkflowDocsOptions) {
  const { packageName, monorepoContext } = options;
  const currentDir = monorepoContext.monorepoPackageDirectories[packageName];
  const workflowList = execSync("npm exec saf-workflow list", {
    cwd: currentDir,
  });
  const workflowListString = workflowList.toString();
  const workflowNames = workflowListString
    .split("\n")
    .filter(Boolean)
    .map((name) => name.trim());
  if (workflowNames.length === 0) {
    return;
  }
  console.log("\nGenerating workflow docs...");
  const workflowsDir = `${currentDir}/docs/workflows`;
  mkdirSync(workflowsDir, { recursive: true });
  for (const file of readdirSync(workflowsDir)) {
    unlinkSync(`${workflowsDir}/${file}`);
  }
  const workflowDocs = workflowNames.map((workflowName) => {
    const basename = workflowName.split("/").pop();
    const doc = getWorkflowDoc(workflowName);
    const filePath = `${workflowsDir}/${basename}.md`;
    writeFileSync(filePath, doc);
    return {
      name: workflowName,
      path: `./${basename}.md`,
    };
  });

  const indexDoc = `# Workflow Reference

\`${packageName}\` provides the following automated workflows for packages depending on it:

${workflowDocs.map(({ name, path }) => `- [${name}](${path})`).join("\n")}`;

  writeFileSync(`${workflowsDir}/index.md`, indexDoc);
  console.log("Finished generating workflow docs at ./docs/workflows");
}

const getWorkflowDoc = (workflowName: string) => {
  const workflowHelp = execSync(`npm exec saf-workflow info ${workflowName}`);
  const command = workflowHelp.toString().split("\n")[0].replace("Usage: ", "");

  let checklist = "";
  try {
    checklist = execSync(
      `npm exec saf-workflow checklist ${workflowName}`,
    ).toString();
  } catch (error) {
    console.error(`\n\nError getting checklist for ${workflowName}`);
    process.exit(1);
  }

  const sourceUrl = execSync(`npm exec saf-workflow source ${workflowName}`)
    .toString()
    .trim();
  const sourceName = sourceUrl.split("/").pop();

  return `# ${workflowName}

## Source

[${sourceName}](${sourceUrl})

## Usage

\`\`\`bash
${command}
\`\`\`

To run this workflow automatically, tell the agent to:

1. Navigate to the target package
2. Run this command
3. Follow the instructions until done

## Checklist

When run, the workflow will:

${checklist.toString()}

## Help Docs

\`\`\`bash
${workflowHelp.toString()}
\`\`\`
`;
};
