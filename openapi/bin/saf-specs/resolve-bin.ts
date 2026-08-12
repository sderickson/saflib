import { createRequire } from "node:module";
import path from "node:path";

/**
 * Resolve a dependency's CLI entrypoint from node_modules.
 * Avoids relying on PATH (e.g. when saf-specs runs from workflow temp dirs in CI).
 */
export function resolvePackageBin(
  packageName: string,
  binName = packageName,
): string {
  const require = createRequire(import.meta.url);
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
}
