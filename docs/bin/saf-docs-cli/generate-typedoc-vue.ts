import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

  const componentsDir = join(outDir, "components");
  if (existsSync(componentsDir)) {
    for (const file of readdirSync(componentsDir)) {
      if (file.endsWith(".vue.d.ts")) {
        entryPoints.push(rel(join(componentsDir, file)));
      }
    }
  }

  const pagesDir = join(outDir, "pages");
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir, { recursive: true })) {
      if (typeof file === "string" && file.endsWith(".vue.d.ts")) {
        entryPoints.push(rel(join(pagesDir, file)));
      }
    }
  }

  return [...new Set(entryPoints)].sort();
}
