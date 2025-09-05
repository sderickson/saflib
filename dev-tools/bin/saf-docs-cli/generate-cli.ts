import { getCurrentPackageName, type MonorepoContext } from "../workspace.ts";
import { execSync } from "node:child_process";

import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";

export function generateCliDocs(monorepoContext: MonorepoContext) {
  const currentPackage = getCurrentPackageName();
  const currentPackageJson =
    monorepoContext.monorepoPackageJsons[currentPackage];

  const bin = currentPackageJson.bin;
  if (bin && Object.keys(bin).length > 0) {
    console.log("\nGenerating CLI docs...");
    mkdirSync("docs/cli", { recursive: true });
    for (const file of readdirSync("docs/cli")) {
      unlinkSync(`docs/cli/${file}`);
    }

    const sortedCommands = Object.keys(bin).sort();

    for (const command of sortedCommands) {
      const result = execSync(`npm exec ${command} help`);
      const wrappedResult = `# ${command}\n\n\`\`\`\n${result.toString()}\n\`\`\`\n`;
      writeFileSync(`docs/cli/${command}.md`, wrappedResult);
      console.log(`- ${command}`);
    }

    const indexMd = `# CLI Reference\n\nThis package provides commands in its package.json bin field. These are listed below:\n\n${sortedCommands
      .map((command) => `- [${command}](./${command}.md)`)
      .join("\n")}`;
    writeFileSync("docs/cli/index.md", indexMd);
    console.log("Finished generating CLI docs at ./docs/cli");
  }
}
