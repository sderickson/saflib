import { execSync } from "node:child_process";
import { type MonorepoContext } from "@saflib/monorepo/workspace";
import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import {
  buildVueTypedocEntryPoints,
  emitVueDeclarations,
  getDeclarationOutDir,
  isVuePackage,
  writeVueTypedocTsconfig,
} from "./generate-typedoc-vue.ts";

export interface GenerateTypeDocOptions {
  monorepoContext: MonorepoContext;
  packageName: string;
}

// VitePress skips markdown under docs/ref/dist; relocate spec ref output to modules/.
function relocateDistRefDocs(packageDir: string) {
  const refDist = join(packageDir, "docs/ref/dist");
  const refModules = join(packageDir, "docs/ref/modules");
  if (!existsSync(refDist)) return;

  rmSync(refModules, { recursive: true, force: true });
  renameSync(refDist, refModules);

  const rewriteLinks = (filePath: string) => {
    let content = readFileSync(filePath, "utf-8");
    const updated = content.replaceAll("dist/", "modules/");
    if (updated !== content) writeFileSync(filePath, updated);
  };

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) rewriteLinks(full);
    }
  };

  rewriteLinks(join(packageDir, "docs/ref/index.md"));
  walk(refModules);
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
  const declarationOutDir = getDeclarationOutDir(currentPackageDir);
  let vueDeclarationEntryPoints: string[] = [];

  if (vuePackage) {
    emitVueDeclarations(currentPackageDir, currentPackageJson);
    vueDeclarationEntryPoints = buildVueTypedocEntryPoints(
      currentPackageDir,
      declarationOutDir,
    );
    if (!vueDeclarationEntryPoints.length) {
      throw new Error(
        `No Vue declaration entry points found in ${packageName}. Run vue-tsc first.`,
      );
    }
  }

  let entrypointCommands = entrypointValues
    .filter((entrypoint) => !entrypoint.includes("./workflows"))
    .filter((entrypoint) => !entrypoint.includes("./eslint.config.js"))
    .filter((entrypoint) => !entrypoint.includes("./tsconfig.json"))
    .filter((entrypoint) => vuePackage || !entrypoint.includes("./components"))
    .filter((entrypoint) => !entrypoint.endsWith(".json"))
    .filter((entrypoint) => !entrypoint.endsWith(".yaml"))
    .filter((entrypoint) => !entrypoint.endsWith(".yml"))
    .map((entrypoint) => {
      return `--entryPoints ${entrypoint}`;
    });
  const typedoc = `${currentPackageDir}/typedoc.json`;
  const hasPackageTypedoc = existsSync(typedoc);
  if (vuePackage) {
    entrypointCommands = vueDeclarationEntryPoints.map(
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
  if (vuePackage) {
    writeVueTypedocTsconfig(
      packageDir,
      declarationOutDir,
      vueDeclarationEntryPoints,
    );
    wroteTypedocTsconfig = true;
  } else if (tsconfigBase && !hasPackageTypedoc) {
    writeFileSync(
      typedocTsconfigPath,
      JSON.stringify(
        {
          extends: tsconfigBase,
          compilerOptions: {
            noEmit: true,
          },
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
  }

  const command = [
    "typedoc",

    // for each entrypoint, add the entrypoint command
    ...entrypointCommands,

    wroteTypedocTsconfig ? "--tsconfig typedoc.tsconfig.json" : "",

    // Generated tsconfigs are for doc extraction; cross-package imports are not
    // fully type-checkable without every dependency's declaration output.
    hasPackageTypedoc || vuePackage || wroteTypedocTsconfig
      ? "--skipErrorChecking"
      : "",

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
    relocateDistRefDocs(packageDir);
  } catch (e) {
    console.error("Failed to generate docs. Fix warnings above.");
    process.exit(1);
  } finally {
    if (wroteTypedocTsconfig) {
      unlinkSync(typedocTsconfigPath);
    }
  }
}
