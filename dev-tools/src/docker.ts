import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getAllPackageWorkspaceDependencies,
  type MonorepoContext,
} from "./workspace.ts";

export function generateDockerfiles(
  monorepoContext: MonorepoContext,
  verbose: boolean = false,
): void {
  for (const packageName of monorepoContext.packagesWithDockerfileTemplates) {
    let packages = getAllPackageWorkspaceDependencies(
      packageName,
      monorepoContext,
    );
    packages.add(packageName);

    const dockerTemplate = readFileSync(
      path.join(
        monorepoContext.monorepoPackageDirectories[packageName],
        "Dockerfile.template",
      ),
      "utf-8",
    );

    // bun won't successfully install unless all the monorepo packages are present
    // see: https://github.com/oven-sh/bun/issues/5792#issuecomment-2673078285
    const imageName = dockerTemplate.match(/^FROM\s+(.+)$/m)?.[1];
    if (imageName?.includes("/bun:")) {
      packages = monorepoContext.packages;
    }

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
