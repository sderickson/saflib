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

/**
 * `saf-git-hashes` is a bin of `@saflib/docker`. Always stage/copy that package
 * (and its workspace deps) so the CLI source is present inside the image.
 */
function withDockerForGitHashes(
  packages: Set<string>,
  ctx: MonorepoContext,
): Set<string> {
  if (!ctx.monorepoPackageDirectories["@saflib/docker"]) {
    return packages;
  }
  return packages
    .union(getAllPackageWorkspaceDependencies("@saflib/docker", ctx))
    .union(new Set(["@saflib/docker"]));
}

/**
 * Invoke the CLI by path from `/app` (WORKDIR during the git-hashes RUN).
 *
 * `npm install` runs against package.json stubs only, so npm does not create
 * `node_modules/.bin` links when the bin target files are missing — `npm exec
 * saf-git-hashes` would then hit the public registry (404).
 *
 * Downstream prod Dockerfiles (e.g. Caddy) should not re-run this after changing
 * WORKDIR to a client package — hashes are already in the base client image.
 */
function gitHashesCommand(ctx: MonorepoContext): string {
  const dockerDir = ctx.monorepoPackageDirectories["@saflib/docker"];
  if (!dockerDir) {
    return "npm exec saf-git-hashes";
  }
  const rel = path.relative(ctx.rootDir, dockerDir).split(path.sep).join("/");
  return `/app/${rel}/bin/saf-git-hashes/index.ts`;
}

export function generateDockerfiles(
  ctx: MonorepoContext,
  verbose: boolean = false,
): void {
  for (const packageName of ctx.packagesWithDockerfileTemplates) {
    const packages = withDockerForGitHashes(
      getAllPackageWorkspaceDependencies(packageName, ctx).union(
        new Set([packageName]),
      ),
      ctx,
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
    const hashCmd = gitHashesCommand(ctx);
    const gitHashesStep = [
      // Client images COPY workspace paths, not `.git`. Host/CI should run
      // `saf-git-hashes` before `docker build` so `saflib/vue/src/git-hashes.json`
      // is in the context. When `.git` exists in the image, refresh hashes here.
      "RUN (command -v git >/dev/null 2>&1 || (apt-get update \\",
      "  && apt-get install -y --no-install-recommends git \\",
      "  && rm -rf /var/lib/apt/lists/*)) \\",
      `  && (git -C /app rev-parse HEAD >/dev/null 2>&1 && ${hashCmd} || echo "Skipping saf-git-hashes: no .git in build context (using pre-generated git-hashes.json)")`,
    ].join("\n");

    // Templates that need hashes after extra COPY layers (e.g. full saflib)
    // can place `#{ git_hashes }#` explicitly; otherwise append after copy_src.
    const hasExplicitGitHashes = dockerTemplate.includes("#{ git_hashes }#");
    const copySrcReplacement = hasExplicitGitHashes
      ? copySrcCommand
      : `${copySrcCommand}\n${gitHashesStep}`;

    const packageRel = path
      .relative(ctx.rootDir, ctx.monorepoPackageDirectories[packageName])
      .split(path.sep)
      .join("/");
    const packageRoot = `/app/${packageRel}`;

    const dockerfileContents = dockerTemplate
      .replace("#{ copy_packages }#", copyPackageJsonCommand)
      .replace("#{ copy_src }#", copySrcReplacement)
      .replace("#{ git_hashes }#", gitHashesStep)
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
