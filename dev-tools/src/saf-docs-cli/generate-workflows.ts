import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { getCurrentPackageName } from "../workspace.ts";

export function generateWorkflowDocs() {
  const currentPackage = getCurrentPackageName();
  const workflowList = execSync("npm exec saf-workflow list");
  const workflowListString = workflowList.toString();
  const workflowNames = workflowListString.split("\n").filter(Boolean);
  if (workflowNames.length === 0) {
    return;
  }
  console.log("Generating workflow docs...");
  const currentDir = process.cwd();
  const workflowsDir = `${currentDir}/docs/workflows`;
  mkdirSync(workflowsDir, { recursive: true });
  for (const file of readdirSync(workflowsDir)) {
    unlinkSync(`${workflowsDir}/${file}`);
  }
  const workflowDocs = workflowNames.map((workflowName) => {
    const doc = getWorkflowDoc(workflowName);
    const filePath = `${workflowsDir}/${workflowName}.md`;
    writeFileSync(filePath, doc);
    return {
      name: workflowName,
      path: `./${workflowName}.md`,
    };
  });

  const indexDoc = `# Workflow Reference

\`${currentPackage}\` provides the following automated workflows for packages depending on it:

${workflowDocs.map(({ name, path }) => `- [${name}](${path})`).join("\n")}`;

  writeFileSync(`${workflowsDir}/index.md`, indexDoc);
  console.log("Finished generating workflow docs at ./docs/workflows");
}

const getWorkflowDoc = (workflowName: string) => {
  const workflow = execSync(
    `npm exec saf-workflow kickoff help ${workflowName}`,
  );
  const command = workflow
    .toString()
    .split("\n")[0]
    .replace("Usage: ", "npm exec ")
    .replace("[options] ", "");
  const checklist = execSync(`npm exec saf-workflow checklist ${workflowName}`);
  return `# ${workflowName}

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
${workflow.toString()}
\`\`\`
`;
};
