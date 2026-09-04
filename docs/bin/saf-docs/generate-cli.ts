import { type MonorepoContext } from "@saflib/monorepo/workspace";
import { execSync } from "node:child_process";
import path from "node:path";

import { mkdirSync, rmSync, writeFileSync } from "node:fs";

export interface GenerateCliDocsOptions {
  monorepoContext: MonorepoContext;
  packageName: string;
}

function runBinHelp(binScriptPath: string, helpArgs: string[] = ["--help"]): string {
  const argStr = helpArgs.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(" ");
  return execSync(
    `node --experimental-strip-types --disable-warning=ExperimentalWarning "${binScriptPath}" ${argStr}`,
    { encoding: "utf8" },
  );
}

export function parseTopLevelCommands(helpText: string): string[] {
  const commandsIndex = helpText.indexOf("Commands:");
  if (commandsIndex === -1) return [];

  const lines = helpText.slice(commandsIndex + "Commands:".length).split("\n");
  const commands: string[] = [];

  for (const line of lines) {
    const match = line.match(/^  ([a-z][\w-]*)/);
    if (!match) {
      if (line.includes("help [command]")) break;
      continue;
    }
    const name = match[1]!;
    if (name !== "help") commands.push(name);
  }
  return commands;
}

function wrapCliDoc(title: string, helpText: string): string {
  return `# ${title}\n\n\`\`\`\n${helpText.trimEnd()}\n\`\`\`\n`;
}

export function generateCliDocs(options: GenerateCliDocsOptions) {
  const { monorepoContext, packageName } = options;
  const currentPackageJson = monorepoContext.monorepoPackageJsons[packageName];
  const packageDir = monorepoContext.monorepoPackageDirectories[packageName];

  const bin = currentPackageJson.bin;
  if (bin && Object.keys(bin).length > 0) {
    console.log("\nGenerating CLI docs...");
    const cliDocsDir = "docs/cli";
    rmSync(cliDocsDir, { recursive: true, force: true });
    mkdirSync(cliDocsDir, { recursive: true });

    const sortedCommands = Object.keys(bin).sort();

    for (const command of sortedCommands) {
      const binScriptPath = path.join(packageDir, bin[command]!);
      const result = runBinHelp(binScriptPath);
      const subcommands = parseTopLevelCommands(result);

      if (subcommands.length > 0) {
        const subcommandDir = path.join(cliDocsDir, command);
        mkdirSync(subcommandDir, { recursive: true });

        let mainDoc = wrapCliDoc(command, result);
        mainDoc += `\n## Subcommands\n\n${subcommands
          .map((subcommand) => `- [${subcommand}](./${command}/${subcommand}.md)`)
          .join("\n")}\n`;
        writeFileSync(path.join(cliDocsDir, `${command}.md`), mainDoc);

        for (const subcommand of subcommands) {
          const subHelp = runBinHelp(binScriptPath, ["help", subcommand]);
          writeFileSync(
            path.join(subcommandDir, `${subcommand}.md`),
            wrapCliDoc(`${command} ${subcommand}`, subHelp),
          );
        }

        console.log(`- ${command} (${subcommands.length} subcommands)`);
      } else {
        writeFileSync(
          path.join(cliDocsDir, `${command}.md`),
          wrapCliDoc(command, result),
        );
        console.log(`- ${command}`);
      }
    }

    const indexMd = `# CLI Reference\n\nThis package provides commands in its package.json bin field. These are listed below:\n\n${sortedCommands
      .map((command) => `- [${command}](./${command}.md)`)
      .join("\n")}`;
    writeFileSync(path.join(cliDocsDir, "index.md"), indexMd);
    console.log("Finished generating CLI docs at ./docs/cli");
  }
}
