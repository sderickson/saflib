import path from "path";
import { buildMonorepoContext } from "../index.ts";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  cpSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import type {
  E2eTestMetadata,
  OverallCoverage,
  PackageMetadata,
  TestAssetManifest,
  UnitTestCoverageMetadata,
} from "../types.ts";

export const gatherTestAssets = async (
  targetDir: string,
): Promise<TestAssetManifest> => {
  const e2eTestsWithScreenshots: E2eTestMetadata[] = [];
  const unitTestCoverageReports: UnitTestCoverageMetadata[] = [];

  const ctx = buildMonorepoContext();

  const packages: PackageMetadata[] = [];

  const targetDirFull = path.join(process.cwd(), targetDir);

  rmSync(targetDirFull, { recursive: true, force: true });

  for (const pkgName in ctx.monorepoPackageDirectories) {
    packages.push({
      name: pkgName,
      repoPath: ctx.monorepoPackageDirectories[pkgName],
    });

    const dir = ctx.monorepoPackageDirectories[pkgName];
    if (existsSync(path.join(dir, "coverage"))) {
      const overallCoverage = parseCoverageLog(
        path.join(dir, "coverage", "coverage-log.txt"),
      );
      const srvPath = path.join("coverage", pkgName.replace("@", ""));
      const metadata: UnitTestCoverageMetadata = {
        packageName: pkgName,
        repoPath: path.join(dir, "coverage"),
        srvPath,
        indexSrvPath: path.join(srvPath, "index.html"),
        overallCoverage,
      };
      unitTestCoverageReports.push(metadata);
      mkdirSync(path.join(targetDirFull, srvPath), { recursive: true });
      cpSync(metadata.repoPath, path.join(targetDirFull, srvPath), {
        recursive: true,
      });
    }

    if (existsSync(path.join(dir, "e2e"))) {
      const e2eTests = readdirSync(path.join(dir, "e2e"), {
        withFileTypes: true,
      });
      for (const e2eTest of e2eTests) {
        if (!e2eTest.isDirectory()) {
          continue;
        }
        const e2eTestPath = path.join(dir, "e2e", e2eTest.name);
        const screenshots = readdirSync(e2eTestPath, {
          withFileTypes: true,
        }).filter(
          (f) =>
            f.isFile() && (f.name.endsWith(".png") || f.name.endsWith(".jpeg")),
        );
        const srvPath = path.join(
          "e2e",
          pkgName.replace("@", ""),
          e2eTest.name,
        );
        const metadata: E2eTestMetadata = {
          name: e2eTest.name,
          repoPath: path.join(dir, "e2e", e2eTest.name),
          screenshots: screenshots.map((s) => ({
            name: s.name,
            repoPath: path.join(dir, "e2e", e2eTest.name, s.name),
            srvPath: path.join(srvPath, s.name),
          })),
          packageName: pkgName,
        };
        e2eTestsWithScreenshots.push(metadata);
        mkdirSync(path.join(targetDirFull, srvPath), {
          recursive: true,
        });
        cpSync(metadata.repoPath, path.join(targetDirFull, srvPath), {
          recursive: true,
        });
      }
    }
  }

  const manifest: TestAssetManifest = {
    packages,
    e2eTestsWithScreenshots,
    unitTestCoverageReports,
  };

  writeFileSync(
    path.join(targetDirFull, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  return {
    packages,
    e2eTestsWithScreenshots,
    unitTestCoverageReports,
  };
};

const parseCoverageLog = (coverageLogPath: string): OverallCoverage | null => {
  if (!existsSync(coverageLogPath)) {
    return null;
  }
  const coverageLog = readFileSync(coverageLogPath, "utf8");
  const coverageLogLines = coverageLog.split("\n");
  const overallCoverage: OverallCoverage | undefined = coverageLogLines
    .map((line) => {
      if (line.startsWith("All files")) {
        const [_, statements, branches, functions, lines] = line
          .split("|")
          .map((s) => s.trim());
        return {
          statements: parseFloat(statements),
          branches: parseFloat(branches),
          functions: parseFloat(functions),
          lines: parseFloat(lines),
        } satisfies OverallCoverage;
      }
      return null;
    })
    .find((c) => c !== null);
  return overallCoverage ?? null;
};
