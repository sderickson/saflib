import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  getAllPackageWorkspaceDependencies,
  type MonorepoContext,
} from "@saflib/monorepo/workspace";

const DEPS_PACKAGE_JSON_KEYS = [
  "name",
  "version",
  "private",
  "type",
  "workspaces",
  "bin",
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "overrides",
  "engines",
] as const;

export function stripPackageJsonForInstall(
  pj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of DEPS_PACKAGE_JSON_KEYS) {
    if (pj[key] !== undefined) {
      out[key] = pj[key];
    }
  }
  return out;
}

export function imageNameFromPackageName(packageName: string): string {
  return packageName.replace(/^@/, "").replace(/\//g, "-");
}

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

function relativePathToFs(relativePath: string): string {
  return relativePath.replace(/^\.\//, "");
}

function stagePackageJsonsForInstall(
  ctx: MonorepoContext,
  imageName: string,
  packages: Set<string>,
): void {
  const stageDir = path.join(ctx.rootDir, ".saf-docker", "stage", imageName);
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  const rootPackageJson = JSON.parse(
    readFileSync(path.join(ctx.rootDir, "package.json"), "utf-8"),
  ) as Record<string, unknown>;
  writeFileSync(
    path.join(stageDir, "package.json"),
    JSON.stringify(stripPackageJsonForInstall(rootPackageJson), null, 2) + "\n",
  );

  writeFileSync(
    path.join(stageDir, "package-lock.json"),
    readFileSync(path.join(ctx.rootDir, "package-lock.json")),
  );

  for (const script of [
    "scripts/postinstall-tsconfig-refs.mjs",
    "scripts/dedupe-vue-runtime.mjs",
  ]) {
    const source = path.join(ctx.rootDir, script);
    if (!existsSync(source)) {
      continue;
    }
    const dest = path.join(stageDir, script);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(source));
  }

  for (const packageRelativePath of getPackageRelativePaths(packages, ctx)) {
    const fsRelativePath = relativePathToFs(packageRelativePath);
    const packageJsonPath = path.join(
      ctx.rootDir,
      fsRelativePath,
      "package.json",
    );
    const packageJson = JSON.parse(
      readFileSync(packageJsonPath, "utf-8"),
    ) as Record<string, unknown>;
    const dest = path.join(stageDir, fsRelativePath, "package.json");
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(
      dest,
      JSON.stringify(stripPackageJsonForInstall(packageJson), null, 2) + "\n",
    );
  }
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
    const isBun = usesBun(dockerTemplate);
    const imageName = imageNameFromPackageName(packageName);

    const packageJsonRelativePaths = getPackageRelativePaths(
      // bun won't successfully install unless all the monorepo packages are present
      // see: https://github.com/oven-sh/bun/issues/5792#issuecomment-2673078285
      isBun ? ctx.packages : packages,
      ctx,
    ).map((relativePath) => relativePath + "/package.json");

    let copyPackageJsonCommand: string;
    if (isBun) {
      const postinstallScripts = [
        "scripts/postinstall-tsconfig-refs.mjs",
        "scripts/dedupe-vue-runtime.mjs",
      ]
        .filter((script) => existsSync(path.join(ctx.rootDir, script)))
        .map((script) => `./${script}`);
      copyPackageJsonCommand = `COPY --parents ./package.json ./package-lock.json ${packageJsonRelativePaths.join(" ")} ${postinstallScripts.join(" ")} ./`;
    } else {
      stagePackageJsonsForInstall(ctx, imageName, packages);
      copyPackageJsonCommand = `COPY .saf-docker/stage/${imageName}/ ./`;
    }

    const copySrcCommand = `COPY --parents ${packageRelativePaths.join(" ")} ./`;

    const packageRel = path
      .relative(ctx.rootDir, ctx.monorepoPackageDirectories[packageName])
      .split(path.sep)
      .join("/");
    const packageRoot = `/app/${packageRel}`;

    const dockerfileContents = dockerTemplate
      .replace("#{ copy_packages }#", copyPackageJsonCommand)
      .replace("#{ copy_src }#", copySrcCommand)
      .replace(/#\{ package_root \}#/g, packageRoot);

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
