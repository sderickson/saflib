import { existsSync, readFileSync } from "fs";
import path, { join } from "node:path";

export const getCurrentPackage = () => {
  const currentPackage = readFileSync(
    join(process.cwd(), "package.json"),
    "utf8",
  );
  return JSON.parse(currentPackage).name;
};

export const getGitHubUrl = (absolutePath: string) => {
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
