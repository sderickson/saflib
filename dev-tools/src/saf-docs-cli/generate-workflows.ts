import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";

export function generateWorkflowDocs() {
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
    const workflow = execSync(
      `npm exec saf-workflow kickoff help ${workflowName}`,
    );
    const command = workflow
      .toString()
      .split("\n")[0]
      .replace("Usage: ", "npm exec ")
      .replace("[options] ", "");
    const checklist = execSync(
      `npm exec saf-workflow checklist ${workflowName}`,
    );
    return `# ${workflowName}

## Usage

\`\`\`bash
${command}
\`\`\`

To run this workflow automatically, tell the agent to:

1. Navigate to the package you want to run this workflow in
2. Run this command
3. Have it follow the tool's instructions until the workflow is complete

## Checklist

When run, the workflow will:

${checklist.toString()}

## Help Docs

\`\`\`bash
${workflow.toString()}
\`\`\`
`;
  });

  writeFileSync(`${workflowsDir}/index.md`, workflowDocs.join("\n"));
  console.log("Finished generating workflow docs at ./docs/workflows");
}
