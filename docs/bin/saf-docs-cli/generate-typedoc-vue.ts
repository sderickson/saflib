import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

interface PackageJson {
  scripts?: Record<string, string>;
}

export function isVuePackage(
  packageDir: string,
  packageJson: PackageJson,
): boolean {
  const typecheck = packageJson.scripts?.typecheck ?? "";
  if (typecheck.includes("vue-tsc")) {
    return true;
  }

  for (const tsconfigName of ["tsconfig.app.json", "tsconfig.json"]) {
    const tsconfigPath = join(packageDir, tsconfigName);
    if (!existsSync(tsconfigPath)) {
      continue;
    }
    const tsconfig = readFileSync(tsconfigPath, "utf-8");
    if (tsconfig.includes("**/*.vue")) {
      return true;
    }
  }

  return false;
}

export function getVueTypecheckCommand(
  packageJson: PackageJson,
  packageDir: string,
): string {
  const typecheck = packageJson.scripts?.typecheck ?? "";
  const match = typecheck.match(/vue-tsc\b.*/);
  if (match) {
    return match[0];
  }
  if (existsSync(join(packageDir, "tsconfig.app.json"))) {
    return "vue-tsc --project tsconfig.app.json";
  }
  return "vue-tsc -b";
}

export function getDeclarationOutDir(packageDir: string): string {
  for (const tsconfigName of ["tsconfig.app.json", "tsconfig.json"]) {
    const tsconfigPath = join(packageDir, tsconfigName);
    if (!existsSync(tsconfigPath)) {
      continue;
    }
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
    const outDir = tsconfig.compilerOptions?.outDir;
    if (typeof outDir === "string") {
      return join(packageDir, outDir);
    }
  }
  return join(packageDir, "dist/types");
}

export function getVueComponentMetaTsconfig(packageDir: string): string | null {
  for (const tsconfigName of ["tsconfig.app.json", "tsconfig.json"]) {
    const tsconfigPath = join(packageDir, tsconfigName);
    if (!existsSync(tsconfigPath)) {
      continue;
    }
    const tsconfig = readFileSync(tsconfigPath, "utf-8");
    if (tsconfig.includes("**/*.vue")) {
      return tsconfigPath;
    }
  }
  return null;
}

export function getMonorepoTsconfigBaseExtends(packageDir: string): string {
  for (const rel of [
    "../monorepo/tsconfig.base.json",
    "../../monorepo/tsconfig.base.json",
    "../../../monorepo/tsconfig.base.json",
  ]) {
    if (existsSync(join(packageDir, rel))) {
      return rel;
    }
  }
  throw new Error(
    `Could not find @saflib/monorepo tsconfig.base.json from ${packageDir}`,
  );
}

export function writeVueTypedocTsconfig(
  packageDir: string,
  outDir: string,
): string {
  const typedocTsconfigPath = join(packageDir, "typedoc.tsconfig.json");
  writeFileSync(
    typedocTsconfigPath,
    JSON.stringify(
      {
        extends: getMonorepoTsconfigBaseExtends(packageDir),
        include: [`${relative(packageDir, outDir)}/**/*.d.ts`],
        compilerOptions: {
          composite: false,
          noEmit: true,
          skipLibCheck: true,
          types: [],
        },
      },
      null,
      2,
    ),
  );
  return typedocTsconfigPath;
}

export function emitVueDeclarations(
  packageDir: string,
  packageJson: PackageJson,
): void {
  const command = getVueTypecheckCommand(packageJson, packageDir);
  const outDir = getDeclarationOutDir(packageDir);
  console.log(`\nEmitting Vue declarations (${command})...`);

  try {
    execSync(command, { stdio: "inherit", cwd: packageDir });
  } catch {
    if (!existsSync(outDir)) {
      throw new Error(
        `vue-tsc failed and ${relative(packageDir, outDir)} was not created`,
      );
    }
    console.warn(
      "vue-tsc reported errors; continuing with existing declaration files",
    );
  }
}

export function buildVueTypedocEntryPoints(
  packageDir: string,
  outDir: string,
): string[] {
  const rel = (path: string) => `./${relative(packageDir, path)}`;
  const entryPoints: string[] = [];

  for (const indexPath of [
    join(outDir, "src/index.d.ts"),
    join(outDir, "testing/index.d.ts"),
    join(outDir, "index.d.ts"),
  ]) {
    if (existsSync(indexPath)) {
      entryPoints.push(rel(indexPath));
    }
  }

  const composablesDir = join(outDir, "composables");
  if (existsSync(composablesDir)) {
    for (const file of readdirSync(composablesDir)) {
      if (file.endsWith(".d.ts")) {
        entryPoints.push(rel(join(composablesDir, file)));
      }
    }
  }

  for (const dirName of ["lib"]) {
    const dir = join(outDir, dirName);
    if (!existsSync(dir)) {
      continue;
    }
    for (const file of readdirSync(dir)) {
      if (file.endsWith(".d.ts")) {
        entryPoints.push(rel(join(dir, file)));
      }
    }
  }

  return [...new Set(entryPoints)].sort();
}
