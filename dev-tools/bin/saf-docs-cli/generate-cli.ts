import { type MonorepoContext } from "@saflib/monorepo/workspace";
import { execSync } from "node:child_process";
import path from "node:path";

import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";

export interface GenerateCliDocsOptions {
  monorepoContext: MonorepoContext;
  packageName: string;
}

function runBinHelp(binScriptPath: string): string {
  return execSync(
    `node --experimental-strip-types --disable-warning=ExperimentalWarning "${binScriptPath}" --help`,
    { encoding: "utf8" },
  );
}

export function generateCliDocs(options: GenerateCliDocsOptions) {
  const { monorepoContext, packageName } = options;
  const currentPackageJson = monorepoContext.monorepoPackageJsons[packageName];
  const packageDir = monorepoContext.monorepoPackageDirectories[packageName];

  const bin = currentPackageJson.bin;
  if (bin && Object.keys(bin).length > 0) {
    console.log("\nGenerating CLI docs...");
    mkdirSync("docs/cli", { recursive: true });
    for (const file of readdirSync("docs/cli")) {
      unlinkSync(`docs/cli/${file}`);
    }

    const sortedCommands = Object.keys(bin).sort();

    for (const command of sortedCommands) {
      const binScriptPath = path.join(packageDir, bin[command]!);
      const result = runBinHelp(binScriptPath);
      const wrappedResult = `# ${command}\n\n\`\`\`\n${result}\n\`\`\`\n`;
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
