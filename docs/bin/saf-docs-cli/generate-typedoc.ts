import { execSync } from "node:child_process";
import { type MonorepoContext } from "@saflib/monorepo/workspace";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  buildVueTypedocEntryPoints,
  emitVueDeclarations,
  getDeclarationOutDir,
  isVuePackage,
} from "./generate-typedoc-vue.ts";

export interface GenerateTypeDocOptions {
  monorepoContext: MonorepoContext;
  packageName: string;
}

export function generateTypeDoc(options: GenerateTypeDocOptions) {
  const { monorepoContext, packageName } = options;
  const currentPackageJson = monorepoContext.monorepoPackageJsons[packageName];
  const currentPackageDir =
    monorepoContext.monorepoPackageDirectories[packageName];

  const entrypoints = currentPackageJson.exports;
  if (!entrypoints) {
    return;
  }

  const entrypointValues = Object.values(entrypoints).filter(
    (entrypoint) => typeof entrypoint === "string",
  );
  if (!entrypointValues.length) {
    return;
  }

  const vuePackage = isVuePackage(currentPackageDir, currentPackageJson);
  if (vuePackage) {
    emitVueDeclarations(currentPackageDir, currentPackageJson);
  }

  let entrypointCommands = entrypointValues
    .filter((entrypoint) => !entrypoint.includes("./workflows"))
    .filter((entrypoint) => !entrypoint.includes("./eslint.config.js"))
    .filter((entrypoint) => !entrypoint.includes("./tsconfig.json"))
    .filter(
      (entrypoint) => vuePackage || !entrypoint.includes("./components"),
    )
    .filter((entrypoint) => !entrypoint.endsWith(".json"))
    .filter((entrypoint) => !entrypoint.endsWith(".yaml"))
    .filter((entrypoint) => !entrypoint.endsWith(".yml"))
    .map((entrypoint) => {
      return `--entryPoints ${entrypoint}`;
    });
  const typedoc = `${currentPackageDir}/typedoc.json`;
  const hasPackageTypedoc = existsSync(typedoc);
  if (vuePackage) {
    const declarationEntryPoints = buildVueTypedocEntryPoints(
      currentPackageDir,
      getDeclarationOutDir(currentPackageDir),
    );
    if (!declarationEntryPoints.length) {
      throw new Error(
        `No Vue declaration entry points found in ${packageName}. Run vue-tsc first.`,
      );
    }
    entrypointCommands = declarationEntryPoints.map(
      (entrypoint) => `--entryPoints ${entrypoint}`,
    );
  } else if (hasPackageTypedoc) {
    const typedocJson = readFileSync(typedoc, "utf-8");
    if (JSON.parse(typedocJson).entryPoints) {
      entrypointCommands = []; // typedoc will take entrypoints from the typedoc.json file
    }
  }

  console.log("\nGenerating typedoc...");
  entrypointCommands.forEach((entrypoint) => {
    console.log(`- ${entrypoint}`);
  });

  const packageDir = monorepoContext.monorepoPackageDirectories[packageName];
  const typedocTsconfigPath = join(packageDir, "typedoc.tsconfig.json");
  let wroteTypedocTsconfig = false;
  const tsconfigBase = existsSync(join(packageDir, "tsconfig.src.json"))
    ? "./tsconfig.src.json"
    : existsSync(join(packageDir, "tsconfig.json"))
      ? "./tsconfig.json"
      : null;
  if (tsconfigBase && !hasPackageTypedoc && !vuePackage) {
    writeFileSync(
      typedocTsconfigPath,
      JSON.stringify(
        {
          extends: tsconfigBase,
          exclude: [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.integration.test.ts",
            "**/*.integration.test.tsx",
            "**/workflows/template/**",
            "**/workflows/templates/**",
            "**/workflows/server-templates/**",
            "**/vitest.config.ts",
            "**/playwright.config.ts",
          ],
        },
        null,
        2,
      ),
    );
    wroteTypedocTsconfig = true;
  } else if (vuePackage && !hasPackageTypedoc) {
    const outDir = getDeclarationOutDir(packageDir);
    writeFileSync(
      typedocTsconfigPath,
      JSON.stringify(
        {
          extends: existsSync(join(packageDir, "tsconfig.app.base.json"))
            ? "./tsconfig.app.base.json"
            : "./tsconfig.json",
          include: [`${relative(packageDir, outDir)}/**/*.d.ts`],
          compilerOptions: {
            composite: false,
            noEmit: true,
            skipLibCheck: true,
          },
        },
        null,
        2,
      ),
    );
    wroteTypedocTsconfig = true;
  }

  const command = [
    "typedoc",

    // for each entrypoint, add the entrypoint command
    ...entrypointCommands,

    wroteTypedocTsconfig ? "--tsconfig typedoc.tsconfig.json" : "",

    // Packages with typedoc.json (e.g. vue) use alternate tsconfigs; skip TS noise.
    hasPackageTypedoc || vuePackage ? "--skipErrorChecking" : "",

    vuePackage ? "--plugin typedoc-plugin-vue" : "",

    // for easy reading on GitHub, Vitepress
    "--plugin typedoc-plugin-markdown",

    // Default is README.md, but these docs are not the entrypoint
    "--entryFileName index",

    // nest the output in docs so as not to trample other docs
    "--out docs/ref",

    // easier reading
    "--indexFormat table",
    "--parametersFormat table",

    // Breadcrumbs are broken? The links have nothing in the square brackets
    "--hideBreadcrumbs",

    // It's nice that typedoc identifies forgotten exports. Use it to enforce!
    "--treatValidationWarningsAsErrors",

    // Workflow context interfaces are intentionally module-private.
    "--validation.notExported false",

    // Cross-package {@link} targets are not always in the same typedoc run.
    "--validation.invalidLink false",

    // Since I'm committing these to the repo, sources will create a bunch of
    // noise with their GitHub-links-with-shas.
    "--disableSources",

    "--excludeInternal",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    execSync(command, {
      stdio: "inherit",
      cwd: packageDir,
    });
  } catch (e) {
    console.error("Failed to generate docs. Fix warnings above.");
    process.exit(1);
  } finally {
    if (wroteTypedocTsconfig) {
      unlinkSync(typedocTsconfigPath);
    }
  }
}
