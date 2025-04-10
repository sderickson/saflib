import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getAllPackageWorkspaceDependencies,
  type MonorepoContext,
} from "./workspace.ts";

function getPackageRelativePaths(
  packages: Set<string>,
  monorepoContext: MonorepoContext,
): string[] {
  return Array.from(packages).map((packageName) => {
    const packageDirectory =
      monorepoContext.monorepoPackageDirectories[packageName];
    return "./" + path.relative(monorepoContext.rootDir, packageDirectory);
  });
}

function usesBun(dockerTemplate: string): boolean {
  return !!dockerTemplate.match(/^FROM\s+(.+)$/m)?.[1]?.includes("/bun:");
}

function readDockerfileTemplate(
  packageName: string,
  monorepoContext: MonorepoContext,
): string {
  return readFileSync(
    path.join(
      monorepoContext.monorepoPackageDirectories[packageName],
      "Dockerfile.template",
    ),
    "utf-8",
  );
}

export function generateDockerfiles(
  ctx: MonorepoContext,
  verbose: boolean = false,
): void {
  for (const packageName of ctx.packagesWithDockerfileTemplates) {
    const packages = getAllPackageWorkspaceDependencies(packageName, ctx).union(
      new Set([packageName]),
    );
    const dockerTemplate = readDockerfileTemplate(packageName, ctx);
    const packageRelativePaths = getPackageRelativePaths(packages, ctx);
    const packageJsonRelativePaths = getPackageRelativePaths(
      // bun won't successfully install unless all the monorepo packages are present
      // see: https://github.com/oven-sh/bun/issues/5792#issuecomment-2673078285
      usesBun(dockerTemplate) ? ctx.packages : packages,
      ctx,
    ).map((path) => path + "/package.json");

    const copyPackageJsonCommand = `COPY --parents ./package.json ./package-lock.json ${packageJsonRelativePaths.join(" ")} ./`;
    const copySrcCommand = `COPY --parents ${packageRelativePaths.join(" ")} ./`;

    const dockerfileContents = dockerTemplate
      .replace("#{ copy_packages }#", copyPackageJsonCommand)
      .replace("#{ copy_src }#", copySrcCommand);

    const dockerfilePath = path.join(
      ctx.monorepoPackageDirectories[packageName],
      "Dockerfile",
    );
    writeFileSync(dockerfilePath, dockerfileContents);
    if (verbose) {
      console.log("Wrote", path.relative(ctx.rootDir, dockerfilePath));
    }
  }
}
