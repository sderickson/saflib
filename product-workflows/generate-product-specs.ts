/**
 * Run `npm run build` in every package under a product root with `saf.kind === "spec"`.
 *
 * Used by product/init because CopyStep skips dist directories, so OpenAPI generated
 * files must be created after install (same as real use after editing YAML).
 *
 * Usage: node --experimental-strip-types ./generate-product-specs.ts <productRoot>
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  classifySafPackage,
  parseSafPackageJson,
} from "@saflib/monorepo";

const productRoot = process.argv[2];
if (!productRoot) {
  console.error(
    "Usage: generate-product-specs.ts <absolute-or-relative-product-root>",
  );
  process.exit(1);
}

const root = path.resolve(productRoot);
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Not a directory: ${root}`);
  process.exit(1);
}

function walkPackageJsonDirs(dir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPackageJsonDirs(full, out);
      continue;
    }
    if (entry.isFile() && entry.name === "package.json") {
      out.push(dir);
    }
  }
}

const packageDirs: string[] = [];
walkPackageJsonDirs(root, packageDirs);

const specDirs = packageDirs.filter((dir) => {
  const pkg = parseSafPackageJson(
    readFileSync(path.join(dir, "package.json"), "utf8"),
  );
  if (!pkg) return false;
  const { kind } = classifySafPackage(pkg);
  const scripts = (
    pkg as { scripts?: Record<string, string> }
  ).scripts;
  return kind === "spec" && typeof scripts?.build === "string";
});

if (specDirs.length === 0) {
  console.log(`No saf.kind=spec packages with a build script under ${root}`);
  process.exit(0);
}

for (const dir of specDirs) {
  console.log(`Generating OpenAPI dist in ${path.relative(root, dir) || "."}…`);
  const result = spawnSync("npm", ["run", "build"], {
    cwd: dir,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Generated dist for ${specDirs.length} spec package(s).`);
