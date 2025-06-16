export interface ScreenshotMetadata {
  name: string; // derived from folder name, presumed kebab-case
  repoPath: string; // relative from root
  srvPath: string; // relative from the target directory
}

export interface E2eTestMetadata {
  name: string; // derived from folder name, presumed kebab-case
  repoPath: string; // relative from root
  screenshots: ScreenshotMetadata[];
  packageName: string;
}

export interface OverallCoverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface UnitTestCoverageMetadata {
  packageName: string;
  repoPath: string; // "coverage" folder relative from the root
  srvPath: string; // "coverage" folder relative from the target directory
  indexSrvPath: string; // "coverage" index.html relative from the target directory
  overallCoverage: OverallCoverage | null;
}

export interface PackageMetadata {
  name: string;
  repoPath: string;
}

export interface TestAssetManifest {
  packages: PackageMetadata[];
  e2eTestsWithScreenshots: E2eTestMetadata[];
  unitTestCoverageReports: UnitTestCoverageMetadata[];
}
