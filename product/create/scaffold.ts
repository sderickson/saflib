import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Root monorepo files copied before npm install (.github comes from product/init). */
export const ROOT_SCAFFOLD_FILES = [
  ".gitignore",
  ".dockerignore",
  ".prettierrc.json",
  ".prettierignore",
  "eslint.config.js",
  "vitest.config.ts",
  "tsconfig.json",
] as const;

export function resolveScaffoldRoot(saflibPath: string): string {
  return join(saflibPath, "templates", "scaffold");
}

export function materializeMonorepoScaffold(options: {
  cwd: string;
  saflibPath: string;
  log: (message: string) => void;
}): void {
  const scaffoldRoot = resolveScaffoldRoot(options.saflibPath);
  if (!existsSync(scaffoldRoot)) {
    throw new Error(
      `Missing monorepo scaffold at ${scaffoldRoot}. ` +
        "Check that the saflib submodule includes templates/scaffold.",
    );
  }

  options.log(`Applying monorepo root scaffold from saflib/templates/scaffold`);

  for (const file of ROOT_SCAFFOLD_FILES) {
    const sourcePath = join(scaffoldRoot, file);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing scaffold file: ${sourcePath}`);
    }

    const destPath = join(options.cwd, file);
    options.log(`Writing ${file}`);
    writeFileSync(destPath, readFileSync(sourcePath, "utf8"), "utf8");
  }
}
