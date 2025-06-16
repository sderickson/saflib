import { buildMonorepoContext } from "../index.ts";

interface ScreenshotMetadata {
  name: string; // derived from folder name, presumed kebab-case
  repoPath: string; // relative from root
  srvPath: string; // relative from the target directory
}

interface E2eTestMetadata {
  name: string; // derived from folder name, presumed kebab-case
  repoPath: string; // relative from root
  screenshots: ScreenshotMetadata[];
}

interface UnitTestCoverageMetadata {}

export const gatherTestAssets = async () => {
  const e2eTestsWithScreenshots = [];
  const unitTestCoverageReports = [];

  const ctx = buildMonorepoContext();
  console.log("root dir", ctx.rootDir);
};
