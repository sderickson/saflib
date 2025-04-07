import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  // getAllPackageWorkspaceDependencies,
  type MonorepoContext,
} from "./workspace.ts";

export function generateDockerfiles(
  monorepoContext: MonorepoContext,
  verbose: boolean = false,
): void {
  for (const packageName of monorepoContext.packagesWithDockerfileTemplates) {
    // const packages = getAllPackageWorkspaceDependencies(
    //   packageName,
    //   monorepoContext,
    // );
    const packages = monorepoContext.packages;
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
