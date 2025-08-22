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
  console.log("workflowsDir", workflowsDir);
  mkdirSync(workflowsDir, { recursive: true });
  for (const file of readdirSync(workflowsDir)) {
    unlinkSync(`${workflowsDir}/${file}`);
  }
  const workflowDocs = workflowNames.map((workflowName) => {
    const workflow = execSync(
      `npm exec saf-workflow kickoff help ${workflowName}`,
    );
    const checklist = execSync(
      `npm exec saf-workflow checklist ${workflowName}`,
    );
    return `# ${workflowName}
\`\`\`\n${workflow.toString()}\n\`\`\`

## Checklist

${checklist.toString()}`;
  });
  console.log(workflowDocs);
  writeFileSync(`${workflowsDir}/index.md`, workflowDocs.join("\n"));
  console.log("Finished generating workflow docs at ./docs/workflows");
}
