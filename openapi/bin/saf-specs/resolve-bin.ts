import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

function resolveBinFrom(
  requireFrom: string,
  packageName: string,
  binName: string,
): string | undefined {
  try {
    const require = createRequire(requireFrom);
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = path.dirname(packageJsonPath);
    const pkg = require(packageJsonPath) as {
      bin?: string | Record<string, string>;
    };

    const binRelative =
      typeof pkg.bin === "string"
        ? pkg.bin
        : pkg.bin?.[binName] ?? pkg.bin?.[packageName];

    if (!binRelative) {
      throw new Error(
        `Could not find bin "${binName}" in package "${packageName}"`,
      );
    }

    return path.join(packageDir, binRelative);
  } catch {
    return undefined;
  }
}

/**
 * Resolve a dependency's CLI entrypoint from node_modules.
 * Avoids relying on PATH (e.g. when saf-specs runs from workflow temp dirs in CI).
 *
 * Search order:
 * 1. Caller's workspace (`process.cwd()`)
 * 2. `@saflib/openapi` package root (where saf-specs lives)
 */
export function resolvePackageBin(
  packageName: string,
  binName = packageName,
): string {
  const openapiPackageJson = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../package.json",
  );
  const searchRoots = [
    path.join(process.cwd(), "package.json"),
    openapiPackageJson,
  ];

  for (const requireFrom of searchRoots) {
    const resolved = resolveBinFrom(requireFrom, packageName, binName);
    if (resolved) {
      return resolved;
    }
  }

  throw new Error(
    `Could not resolve bin "${binName}" for package "${packageName}". ` +
      "Install it in the workspace (e.g. add as a devDependency) and rerun npm install.",
  );
}
