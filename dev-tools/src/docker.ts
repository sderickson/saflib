import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getAllPackageWorkspaceDependencies,
  type MonorepoContext,
} from "./workspace.ts";

function getPackageRelativePaths(
  packages: Set<string>,
  monorepoContext: MonorepoContext,
): string[] {
  return Array.from(packages)
    .sort()
    .map((packageName) => {
      const packageDirectory =
        monorepoContext.monorepoPackageDirectories[packageName];
      return "./" + path.relative(monorepoContext.rootDir, packageDirectory);
    });
}

function getRootPackageName(monorepoContext: MonorepoContext): string {
  const rootPackageName = Object.entries(
    monorepoContext.monorepoPackageDirectories,
  ).find(([, directory]) => directory === monorepoContext.rootDir)?.[0];

  if (!rootPackageName) {
    throw new Error("Could not find root package in monorepo context");
  }

  return rootPackageName;
}

function dockerPackageJsonPath(
  packageName: string,
  monorepoContext: MonorepoContext,
): string {
  const safeName = packageName
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return path.join(monorepoContext.rootDir, ".docker", safeName, "package.json");
}

function writeDockerRootPackageJson(
  packageName: string,
  packageRelativePaths: string[],
  monorepoContext: MonorepoContext,
): string {
  const rootPackageName = getRootPackageName(monorepoContext);
  const rootPackageJson = monorepoContext.monorepoPackageJsons[rootPackageName];
  const dockerPackageJson = {
    name: rootPackageJson.name,
    version: rootPackageJson.version,
    private: true,
    workspaces: packageRelativePaths.map((relativePath) =>
      relativePath.replace(/^\.\//, ""),
    ),
  };

  const outputPath = dockerPackageJsonPath(packageName, monorepoContext);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(dockerPackageJson, null, 2)}\n`);

  return "./" + path.relative(monorepoContext.rootDir, outputPath);
}

function usesBun(dockerTemplate: string): boolean {
  return !!dockerTemplate.match(/^FROM\s+(.+)$/m)?.[1]?.includes("/bun:");
}

/** BuildKit cache mount keeps npm's download cache out of image layers. Do not run npm cache clean here — it conflicts with the mounted cache dir. */
const NPM_CI_OMIT_DEV =
  "RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev";

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
    ).map((relativePath) => relativePath + "/package.json");

    const dockerRootPackageJson = writeDockerRootPackageJson(
      packageName,
      packageRelativePaths,
      ctx,
    );
    const copyPackageJsonCommand = `COPY ${dockerRootPackageJson} ./package.json\nCOPY --parents ./package-lock.json ${packageJsonRelativePaths.join(" ")} ./`;
    const copySrcCommand = `COPY --parents ${packageRelativePaths.join(" ")} ./`;

    const dockerfileContents = dockerTemplate
      .replace("#{ copy_packages }#", copyPackageJsonCommand)
      .replace("#{ copy_src }#", copySrcCommand)
      .replace("RUN npm ci --omit=dev", NPM_CI_OMIT_DEV);

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
