import { execSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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
  entryPoints: string[] = [],
): string {
  const typedocTsconfigPath = join(packageDir, "typedoc.tsconfig.json");
  const files =
    entryPoints.length > 0
      ? entryPoints.map((entryPoint) => entryPoint.replace(/^\.\//, ""))
      : [`${relative(packageDir, outDir)}/**/*.d.ts`];

  writeFileSync(
    typedocTsconfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: false,
          skipLibCheck: true,
          noEmit: true,
          types: [],
        },
        ...(entryPoints.length > 0
          ? { files }
          : { include: files, exclude: ["node_modules"] }),
      },
      null,
      2,
    ),
  );
  return typedocTsconfigPath;
}

const DECLARATION_CLEANUP_SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "docs",
  ".git",
]);

export function isEmittedDeclarationArtifact(filePath: string): boolean {
  if (filePath.endsWith(".d.ts.map")) {
    return isEmittedDeclarationArtifact(filePath.slice(0, -".map".length));
  }
  if (!filePath.endsWith(".d.ts")) {
    return false;
  }
  if (filePath.endsWith(".vue.d.ts")) {
    return existsSync(filePath.slice(0, -".d.ts".length));
  }
  const base = filePath.slice(0, -".d.ts".length);
  return existsSync(`${base}.ts`) || existsSync(`${base}.tsx`);
}

/** Remove declaration files emitted for TypeDoc (vue-tsc). */
export function cleanupEmittedDeclarationArtifacts(packageDir: string): number {
  let removed = 0;
  const outDir = getDeclarationOutDir(packageDir);
  if (existsSync(outDir)) {
    removed += countFilesInDir(outDir);
    rmSync(outDir, { recursive: true, force: true });
  }
  removed += removeEmittedDeclarationsInTree(packageDir);
  return removed;
}

function countFilesInDir(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFilesInDir(fullPath);
    } else {
      count += 1;
    }
  }
  return count;
}

function removeEmittedDeclarationsInTree(dir: string): number {
  let removed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (DECLARATION_CLEANUP_SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += removeEmittedDeclarationsInTree(fullPath);
      continue;
    }
    if (
      (entry.name.endsWith(".d.ts") || entry.name.endsWith(".d.ts.map")) &&
      isEmittedDeclarationArtifact(fullPath)
    ) {
      unlinkSync(fullPath);
      removed += 1;
    }
  }
  return removed;
}

export function clearVueDeclarationCache(packageDir: string): void {
  rmSync(getDeclarationOutDir(packageDir), { recursive: true, force: true });
  for (const tsconfigName of ["tsconfig.app.json", "tsconfig.json"]) {
    const tsconfigPath = join(packageDir, tsconfigName);
    if (!existsSync(tsconfigPath)) {
      continue;
    }
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
    const tsBuildInfoFile = tsconfig.compilerOptions?.tsBuildInfoFile;
    if (typeof tsBuildInfoFile === "string") {
      rmSync(join(packageDir, tsBuildInfoFile), { force: true });
    }
  }
}

export function emitVueDeclarations(
  packageDir: string,
  packageJson: PackageJson,
): void {
  clearVueDeclarationCache(packageDir);

  let command = getVueTypecheckCommand(packageJson, packageDir);
  // Doc generation deletes dist/types in cleanup; stale tsbuildinfo otherwise skips emit.
  if (/\s-b(\s|$)/.test(command) && !command.includes("--force")) {
    command = `${command} --force`;
  }
  const outDir = getDeclarationOutDir(packageDir);
  console.log(`\nEmitting Vue declarations (${command})...`);

  execSync(command, { stdio: "inherit", cwd: packageDir });

  if (!buildVueTypedocEntryPoints(packageDir, outDir).length) {
    throw new Error(
      `vue-tsc did not emit declaration files in ${relative(packageDir, outDir)}`,
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
