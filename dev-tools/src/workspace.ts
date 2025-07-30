import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { packageName, directoryPath, PackageJson } from "../types.ts";

export interface MonorepoPackageJsons {
  [key: packageName]: PackageJson;
}

export interface MonorepoPackageDirectories {
  [key: packageName]: directoryPath;
}

export interface WorkspaceDependencyGraph {
  [key: packageName]: packageName[];
}

export interface MonorepoContext {
  rootDir: string;
  packages: Set<packageName>;
  monorepoPackageJsons: MonorepoPackageJsons;
  workspaceDependencyGraph: WorkspaceDependencyGraph;
  monorepoPackageDirectories: MonorepoPackageDirectories;
  packagesWithDockerfileTemplates: Set<packageName>;
}

export function getMonorepoPackages(
  rootDir: string,
): Pick<
  MonorepoContext,
  "monorepoPackageJsons" | "monorepoPackageDirectories"
> {
  const monorepoPackageJsons: MonorepoPackageJsons = {};
  const monorepoPackageDirectories: MonorepoPackageDirectories = {};

  // root package
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("package.json not found");
  }
  const rootPackageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf-8"),
  ) as PackageJson;
  monorepoPackageJsons[rootPackageJson.name] = rootPackageJson;
  monorepoPackageDirectories[rootPackageJson.name] = rootDir;

  // workspaces
  const workspaces = rootPackageJson.workspaces ?? [];
  const workspacePackageDirectories: directoryPath[] = [];

  for (const workspace of workspaces) {
    // should probably just use a glob library...
    if (workspace.endsWith("/**")) {
      // recursively find all workspaces
      const workspacesDir = path.join(rootDir, workspace.slice(0, -2));
      const workspacesFolders = readdirSync(workspacesDir, {
        recursive: true,
        withFileTypes: true,
      });
      for (const file of workspacesFolders) {
        if (file.isFile() && file.name.endsWith("package.json")) {
          workspacePackageDirectories.push(file.parentPath);
        }
      }
    } else if (workspace.endsWith("/*")) {
      const workspacesDir = path.join(rootDir, workspace.slice(0, -1));
      const workspacesFolders = readdirSync(workspacesDir)
        .filter((folder) => !folder.startsWith("."))
        .filter((folder) =>
          statSync(path.join(workspacesDir, folder)).isDirectory(),
        );
      for (const workspaceFolder of workspacesFolders) {
        workspacePackageDirectories.push(
          path.join(workspacesDir, workspaceFolder),
        );
      }
    } else {
      workspacePackageDirectories.push(path.join(rootDir, workspace));
    }
  }

  for (const workspacePackageDirectory of workspacePackageDirectories) {
    const workspacePackageJsonPath = path.join(
      workspacePackageDirectory,
      "package.json",
    );
    if (!existsSync(workspacePackageJsonPath)) {
      continue;
    }
    const workspacePackageJson = JSON.parse(
      readFileSync(workspacePackageJsonPath, "utf-8"),
    ) as PackageJson;
    monorepoPackageJsons[workspacePackageJson.name] = workspacePackageJson;
    monorepoPackageDirectories[workspacePackageJson.name] =
      workspacePackageDirectory;
  }

  return {
    monorepoPackageJsons,
    monorepoPackageDirectories,
  };
}

export function buildWorkspaceDependencyGraph(
  monorepoPackageJsons: MonorepoPackageJsons,
): WorkspaceDependencyGraph {
  const dependencyGraph: WorkspaceDependencyGraph = {};

  for (const packageJson of Object.values(monorepoPackageJsons)) {
    dependencyGraph[packageJson.name] = Object.keys(
      packageJson.dependencies ?? {},
    ).filter((dependency) => monorepoPackageJsons[dependency] !== undefined);
  }

  return dependencyGraph;
}

export function findPackagesWithDockerfileTemplates(
  monorepoPackageDirectories: MonorepoPackageDirectories,
): string[] {
  const packageList: string[] = [];

  for (const packageName of Object.keys(monorepoPackageDirectories)) {
    const packageDirectory = monorepoPackageDirectories[packageName];
    const dockerfileTemplatePath = path.join(
      packageDirectory,
      "Dockerfile.template",
    );
    if (existsSync(dockerfileTemplatePath)) {
      packageList.push(packageName);
    }
  }

  return packageList;
}

function findMonorepoRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(currentDir, "package-lock.json"))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        "Could not find package-lock.json in the current directory or any parent directories.",
      );
    }
    currentDir = parentDir;
  }
}

export function buildMonorepoContext(rootDir?: string): MonorepoContext {
  const effectiveRootDir = rootDir
    ? path.resolve(rootDir)
    : findMonorepoRoot(process.cwd());
  const { monorepoPackageJsons, monorepoPackageDirectories } =
    getMonorepoPackages(effectiveRootDir);
  const workspaceDependencyGraph =
    buildWorkspaceDependencyGraph(monorepoPackageJsons);

  return {
    rootDir: effectiveRootDir,
    packages: new Set(Object.keys(monorepoPackageJsons)),
    monorepoPackageJsons,
    workspaceDependencyGraph,
    monorepoPackageDirectories,
    packagesWithDockerfileTemplates: new Set(
      findPackagesWithDockerfileTemplates(monorepoPackageDirectories),
    ),
  };
}

export function getAllPackageWorkspaceDependencies(
  packageName: packageName,
  monorepoContext: MonorepoContext,
): Set<packageName> {
  console.log(
    "looking at",
    packageName,
    monorepoContext.workspaceDependencyGraph[packageName],
  );
  console.log("graph", monorepoContext.workspaceDependencyGraph);
  let flattenedDependencies = new Set(
    monorepoContext.workspaceDependencyGraph[packageName],
  );
  for (const dependency of flattenedDependencies) {
    flattenedDependencies = flattenedDependencies.union(
      getAllPackageWorkspaceDependencies(dependency, monorepoContext),
    );
  }
  return flattenedDependencies;
}

export function getCurrentPackageName(): packageName {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("package.json not found");
  }
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf-8"),
  ) as PackageJson;
  return packageJson.name;
}
