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
import {
  DEFAULT_BUILD_NAME,
  deriveImageName,
  findBuild,
  listBuilds,
  type Build,
} from "./builds.ts";
import { buildMetadataStep } from "./metadata.ts";
import { contextIgnorePath, generateContextIgnore } from "./context-ignore.ts";
import {
  narrowRootPackageJson,
  pruneLockfile,
  type Lockfile,
} from "./lockfile.ts";

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

/** Image name of a package's `default` build. */
export function imageNameFromPackageName(packageName: string): string {
  return deriveImageName(packageName, DEFAULT_BUILD_NAME);
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

function relativePathToFs(relativePath: string): string {
  return relativePath.replace(/^\.\//, "");
}

export function stageRootPackageName(
  rootName: string | undefined,
  imageName: string,
): string {
  const base = rootName?.trim() || "workspace";
  return `${base}--docker-${imageName}`;
}

export function isSaflibMonorepoRoot(
  rootDir: string,
  rootName: unknown,
): boolean {
  if (typeof rootName === "string" && rootName.startsWith("@saflib/")) {
    return true;
  }
  return path.basename(rootDir) === "saflib";
}

/**
 * Production images run `npm ci --omit=dev`. Dropping `devDependencies` from
 * staged manifests keeps `npm ci` from requiring lock entries for tooling that
 * never installs into the image (eslint trees, @types/*, vitest, …).
 */
export function stripDevDependencies(
  pj: Record<string, unknown>,
): Record<string, unknown> {
  const { devDependencies: _devDependencies, ...rest } = pj;
  return rest;
}

export interface StageInstallOptions {
  imageName: string;
  /** Root-relative posix dirs of the workspaces the image includes. */
  workspaceDirs: readonly string[];
  /** Names of the workspaces the image includes. */
  imageWorkspaceNames: ReadonlySet<string>;
  /** Names of every workspace in the monorepo. */
  allWorkspaceNames: ReadonlySet<string>;
  isSaflibRoot: boolean;
}

/**
 * The root `package.json` and `package-lock.json` one image installs from,
 * derived from the monorepo's. Pure, so history-based tooling
 * (`saf-docker skip-rate`) can stage past commits exactly as builds do.
 *
 * Both are narrowed to the image: workspaces listed explicitly, root
 * dependencies on other images' workspaces dropped, and the lockfile pruned
 * to what the image can reach (see {@link pruneLockfile}). An image's staged
 * install inputs therefore change only when its own dependencies do.
 */
export function stageInstallManifests(
  rootPackageJson: Record<string, unknown>,
  lockfile: Lockfile,
  options: StageInstallOptions,
): { packageJson: Record<string, unknown>; lockfile: Lockfile } {
  const workspaceDirs = [...options.workspaceDirs].sort();
  const excludedWorkspaceNames = new Set(
    [...options.allWorkspaceNames].filter(
      (name) => !options.imageWorkspaceNames.has(name),
    ),
  );
  const stripped = stripDevDependencies(
    stripPackageJsonForInstall(rootPackageJson),
  );
  // Saflib's lock root omits override metadata; restating those overrides
  // makes `npm ci` reject the copied lock. Product locks are generated with
  // the root overrides applied (for example esbuild ^0.28.0 over a workspace
  // that still asks for ^0.27.0), so the staged root must keep them or
  // `npm ci` resolves the un-overridden range and reports it missing.
  if (options.isSaflibRoot) {
    delete stripped.overrides;
    const lockRootDependencies = lockfile.packages?.[""]?.dependencies;
    if (lockRootDependencies) stripped.dependencies = lockRootDependencies;
  }
  const packageJson = narrowRootPackageJson(stripped, {
    name: stageRootPackageName(
      typeof stripped.name === "string" ? stripped.name : undefined,
      options.imageName,
    ),
    workspaceDirs,
    excludedWorkspaceNames,
  });
  return {
    packageJson,
    lockfile: pruneLockfile(lockfile, { workspaceDirs, excludedWorkspaceNames }),
  };
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
  const staged = stageInstallManifests(
    rootPackageJson,
    JSON.parse(
      readFileSync(path.join(ctx.rootDir, "package-lock.json"), "utf-8"),
    ) as Lockfile,
    {
      imageName,
      workspaceDirs: getPackageRelativePaths(packages, ctx).map(
        relativePathToFs,
      ),
      imageWorkspaceNames: packages,
      allWorkspaceNames: ctx.packages,
      isSaflibRoot: isSaflibMonorepoRoot(ctx.rootDir, rootPackageJson.name),
    },
  );
  writeFileSync(
    path.join(stageDir, "package.json"),
    JSON.stringify(staged.packageJson, null, 2) + "\n",
  );
  writeFileSync(
    path.join(stageDir, "package-lock.json"),
    JSON.stringify(staged.lockfile, null, 2) + "\n",
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
      JSON.stringify(
        stripDevDependencies(stripPackageJsonForInstall(packageJson)),
        null,
        2,
      ) + "\n",
    );
  }
}

/** `#{ image <build ref or package name> }#` in a template. */
const IMAGE_MARKER = /#\{\s*image\s+([@\w./-]+)\s*\}#/g;

/**
 * Generates every build's `Dockerfile` from its `Dockerfile.template` (see
 * {@link listBuilds}) and stages its install manifests. Template markers:
 * - `#{ copy_packages }#`: copy the image's staged install manifests;
 * - `#{ copy_src }#`: copy the image's workspace package dirs;
 * - `#{ package_root }#`: `/app/<package dir>`;
 * - `#{ image <ref> }#`: another build's image (`<image>:latest`), by build
 *   ref or package name — how a template names an upstream build so
 *   `saf-docker build` builds it first;
 * - `#{ git_hashes }#`: deprecated, removed (see build metadata).
 *
 * Every Dockerfile ends with the build metadata step (see
 * {@link buildMetadataStep}).
 */
export function generateDockerfiles(
  ctx: MonorepoContext,
  verbose: boolean = false,
): Build[] {
  const builds = listBuilds(ctx);
  const images = new Set(builds.map((b) => b.image));
  for (const build of builds) {
    const packages = getAllPackageWorkspaceDependencies(
      build.packageName,
      ctx,
    ).union(new Set([build.packageName]));
    const dockerTemplate = readFileSync(build.templatePath, "utf-8");
    const packageRelativePaths = getPackageRelativePaths(packages, ctx);
    const isBun = usesBun(dockerTemplate);

    const packageJsonRelativePaths = getPackageRelativePaths(
      // bun won't successfully install unless all the monorepo packages are present
      // see: https://github.com/oven-sh/bun/issues/5792#issuecomment-2673078285
      isBun ? ctx.packages : packages,
      ctx,
    ).map((relativePath) => relativePath + "/package.json");

    let copyPackageJsonCommand = "";
    if (dockerTemplate.includes("#{ copy_packages }#")) {
      if (isBun) {
        const postinstallScripts = [
          "scripts/postinstall-tsconfig-refs.mjs",
          "scripts/dedupe-vue-runtime.mjs",
        ]
          .filter((script) => existsSync(path.join(ctx.rootDir, script)))
          .map((script) => `./${script}`);
        copyPackageJsonCommand = `COPY --parents ./package.json ./package-lock.json ${packageJsonRelativePaths.join(" ")} ${postinstallScripts.join(" ")} ./`;
      } else {
        stagePackageJsonsForInstall(ctx, build.image, packages);
        copyPackageJsonCommand = `COPY .saf-docker/stage/${build.image}/ ./`;
      }
    }

    const packageRel = path
      .relative(ctx.rootDir, ctx.monorepoPackageDirectories[build.packageName])
      .split(path.sep)
      .join("/");

    const body = dockerTemplate
      .replace("#{ copy_packages }#", copyPackageJsonCommand)
      .replace(
        "#{ copy_src }#",
        `COPY --parents ${packageRelativePaths.join(" ")} ./`,
      )
      .replace(/^[ \t]*#\{ git_hashes \}#[ \t]*\r?\n?/m, "")
      .replace(/#\{ package_root \}#/g, `/app/${packageRel}`)
      .replace(IMAGE_MARKER, (_, identifier: string) => {
        const upstream = findBuild(builds, identifier);
        if (!upstream) {
          throw new Error(
            `${path.relative(ctx.rootDir, build.templatePath)}: unknown build "${identifier}" in #{ image }#`,
          );
        }
        return `${upstream.image}:latest`;
      });
    const otherImages = new Set([...images].filter((i) => i !== build.image));
    const dockerfileContents =
      body.replace(/\s*$/, "\n") +
      buildMetadataStep(body, build.image, otherImages);

    writeFileSync(build.dockerfilePath, dockerfileContents);
    writeFileSync(
      contextIgnorePath(build.dockerfilePath),
      generateContextIgnore(ctx.rootDir, dockerfileContents),
    );
    if (verbose) {
      console.log("Wrote", path.relative(ctx.rootDir, build.dockerfilePath));
    }
  }
  return builds;
}
