import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

// for documentation purposes
type packageName = string;
type directoryPath = string;

interface PackageJson {
  name: packageName;
  workspaces?: string[];
  dependencies?: Record<string, string>;
}

interface MonorepoPackageJsons {
  [key: packageName]: PackageJson;
}

interface MonorepoPackageDirectories {
  [key: packageName]: directoryPath;
}

interface WorkspaceDependencyGraph {
  [key: packageName]: packageName[];
}

interface MonorepoContext {
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
    if (workspace.endsWith("/*")) {
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
    const workspacePackageJson = JSON.parse(
      readFileSync(
        path.join(workspacePackageDirectory, "package.json"),
        "utf-8",
      ),
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

export function buildMonorepoContext(rootDir: string): MonorepoContext {
  const rootDirResolved = path.resolve(rootDir);
  const { monorepoPackageJsons, monorepoPackageDirectories } =
    getMonorepoPackages(rootDirResolved);
  const workspaceDependencyGraph =
    buildWorkspaceDependencyGraph(monorepoPackageJsons);

  return {
    rootDir: rootDirResolved,
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

export function generateDockerfiles(
  monorepoContext: MonorepoContext,
  verbose: boolean = false,
): void {
  for (const packageName of monorepoContext.packagesWithDockerfileTemplates) {
    const packages = getAllPackageWorkspaceDependencies(
      packageName,
      monorepoContext,
    );
    packages.add(packageName);

    const packageRelativePaths = Array.from(packages).map((packageName) => {
      const packageDirectory =
        monorepoContext.monorepoPackageDirectories[packageName];
      return "./" + path.relative(monorepoContext.rootDir, packageDirectory);
    });

    const packageJsonRelativePaths = packageRelativePaths.map(
      (packageRelativePath) => {
        return "./" + path.join(packageRelativePath, "package.json");
      },
    );
    const copyPackageJsonCommand = `COPY --parents ./package.json ./package-lock.json ${packageJsonRelativePaths.join(" ")} ./`;

    const copySrcCommand = `COPY --parents ${packageRelativePaths.join(" ")} ./`;

    const dockerTemplate = readFileSync(
      path.join(
        monorepoContext.monorepoPackageDirectories[packageName],
        "Dockerfile.template",
      ),
      "utf-8",
    );
    const dockerfileContents = dockerTemplate
      .replace("#{ copy_packages }#", copyPackageJsonCommand)
      .replace("#{ copy_src }#", copySrcCommand);

    const dockerfilePath = path.join(
      monorepoContext.monorepoPackageDirectories[packageName],
      "Dockerfile",
    );
    writeFileSync(dockerfilePath, dockerfileContents);
    if (verbose) {
      console.log(
        "Wrote",
        path.relative(monorepoContext.rootDir, dockerfilePath),
      );
    }
  }
}
