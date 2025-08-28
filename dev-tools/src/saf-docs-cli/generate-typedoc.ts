import { execSync } from "node:child_process";
import { getCurrentPackageName, type MonorepoContext } from "../workspace.ts";

export function generateTypeDoc(monorepoContext: MonorepoContext) {
  const currentPackage = getCurrentPackageName();
  const currentPackageJson =
    monorepoContext.monorepoPackageJsons[currentPackage];

  const entrypoints = currentPackageJson.exports;
  if (!entrypoints) {
    throw new Error(
      "No exports found in package.json; use `exports` field not `main`.",
    );
  }
  // TODO: don't generate these if they're in the typedoc.json file.
  const entrypointCommands = Object.values(entrypoints)
    .filter((entrypoint) => !entrypoint.includes("./workflows"))
    .filter((entrypoint) => !entrypoint.includes("./eslint.config.js"))
    .filter((entrypoint) => !entrypoint.includes("./tsconfig.json"))
    .map((entrypoint) => {
      return `--entryPoints ${entrypoint}`;
    });

  console.log("\nGenerating typedoc...");
  const command = [
    "typedoc",

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
  ].join(" ");

  try {
    execSync(command, { stdio: "inherit" });
  } catch (e) {
    console.error("Failed to generate docs. Fix warnings above.");
    process.exit(1);
  }
}
