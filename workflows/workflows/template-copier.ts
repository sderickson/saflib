import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { getSafReporters } from "@saflib/node";

export interface TemplateCopyConfig {
  sourceTargetPairs: Array<{
    source: string;
    target: string;
  }>;
  replacements: Array<{
    from: string;
    to: string;
  }>;
}

export const copyTemplates = async (
  config: TemplateCopyConfig,
): Promise<void> => {
  const { log } = getSafReporters();

  for (const { source, target } of config.sourceTargetPairs) {
    // Ensure target directory exists
    const targetDir = target.substring(0, target.lastIndexOf("/"));
    if (targetDir) {
      execSync(`mkdir -p ${targetDir}`);
    }

    // Check if target file already exists
    if (existsSync(target)) {
      log.warn(`Skipping ${source} -> ${target} (file already exists)`);
      continue;
    }

    // Read template content
    const templateContent = readFileSync(source, "utf8");

    // Apply replacements
    let processedContent = templateContent;

    const globalReplacements = [{ from: "// @ts-nocheck", to: "" }];

    for (const { from, to } of [
      ...globalReplacements,
      ...config.replacements,
    ]) {
      processedContent = processedContent.split(from).join(to);
    }

    // Write the processed content
    writeFileSync(target, processedContent);
    log.info(`Copied ${source} -> ${target}`);
  }
};
