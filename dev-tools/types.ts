// for documentation purposes
export type packageName = string;
export type directoryPath = string;

export interface PackageJson {
  name: packageName;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  description?: string;
  scripts?: Record<string, string>;
}

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

export interface PackageMetadata extends PackageJson {
  repoPath: directoryPath;
  typechecked: boolean;
}

export interface HealthAssetManifest {
  packages: PackageMetadata[];
  e2eTestsWithScreenshots: E2eTestMetadata[];
  unitTestCoverageReports: UnitTestCoverageMetadata[];
}
