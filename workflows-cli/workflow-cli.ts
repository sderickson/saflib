#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { runWorkflowCli } from "@saflib/workflows";
import { workflows } from "./list.ts";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

const getGitHubUrl = (absolutePath: string) => {
  let currentDir = absolutePath;
  while (currentDir !== "/") {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (!existsSync(packageJsonPath)) {
      currentDir = path.dirname(currentDir);
      continue;
    }
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    if (packageJson.name === "@saflib/saflib") {
      break;
    }
    currentDir = path.dirname(currentDir);
  }
  const relativePath = absolutePath.replace(currentDir, "");
  return "https://github.com/sderickson/saflib/blob/main" + relativePath;
};

const systemPrompt = `
This codebase is a SAF monorepo. It follows the recommended patterns as described in saflib/monorepo/docs/01-overview.md, read that to get oriented. Packages you'll be working on depend on generic packages that live in saflib/, and those packages have documentation if you need it.
`;

runWorkflowCli(workflows, {
  getSourceUrl: getGitHubUrl,
  systemPrompt,
});
