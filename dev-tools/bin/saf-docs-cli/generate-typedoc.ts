import { execSync } from "node:child_process";
import { type MonorepoContext } from "@saflib/dev-tools";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Overlay next to the package so `extends` resolves and inferred `include` matches the package. */
const typedocPackageTsconfigName = ".typedoc-tsconfig.json";

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

  let entrypointCommands = entrypointValues
    .filter((entrypoint) => !entrypoint.includes("./workflows"))
    .filter((entrypoint) => !entrypoint.includes("./eslint.config.js"))
    .filter((entrypoint) => !entrypoint.includes("./tsconfig.json"))
    .filter((entrypoint) => !entrypoint.includes("./components"))
    .map((entrypoint) => {
      return `--entryPoints ${entrypoint}`;
    });
  const typedoc = `${currentPackageDir}/typedoc.json`;
  if (existsSync(typedoc)) {
    const typedocJson = readFileSync(typedoc, "utf-8");
    if (JSON.parse(typedocJson).entryPoints) {
      entrypointCommands = []; // typedoc will take entrypoints from the typedoc.json file
    }
  }

  console.log("\nGenerating typedoc...");
  entrypointCommands.forEach((entrypoint) => {
    console.log(`- ${entrypoint}`);
  });

  const typedocPackageTsconfigPath = path.join(
    currentPackageDir,
    typedocPackageTsconfigName,
  );
  writeFileSync(
    typedocPackageTsconfigPath,
    `${JSON.stringify(
      {
        extends: "./tsconfig.json",
        compilerOptions: {
          // TypeDoc type-checks transitive workspace imports (e.g. @saflib/workflows →
          // @saflib/utils). Those packages assume Node; the base tsconfig omits `types`.
          types: ["node"],
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );

  const command = [
    "typedoc",

    `--tsconfig ./${typedocPackageTsconfigName}`,

    // for each entrypoint, add the entrypoint command
    ...entrypointCommands,

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

    // Since I'm committing these to the repo, sources will create a bunch of
    // noise with their GitHub-links-with-shas.
    "--disableSources",

    "--excludeInternal",
  ].join(" ");

  let typedocFailed = false;
  try {
    execSync(command, {
      stdio: "inherit",
      cwd: currentPackageDir,
    });
  } catch (e) {
    typedocFailed = true;
  } finally {
    try {
      unlinkSync(typedocPackageTsconfigPath);
    } catch {
      /* ignore missing file */
    }
  }
  if (typedocFailed) {
    console.error("Failed to generate docs. Fix warnings above.");
    process.exit(1);
  }
}
