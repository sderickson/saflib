#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * Regenerate `env.ts` for every package under a product tree that already has
 * one. Used by product/init after stub packages are omitted from the golden
 * copy — avoids `saf-env generate-all` rewriting unrelated monorepo packages.
 *
 * Usage: node ./regenerate-product-env.ts <productRoot>
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const productRootArg = process.argv[2];
if (!productRootArg) {
  console.error("Usage: regenerate-product-env.ts <productRoot>");
  process.exit(1);
}

const productRoot = path.resolve(productRootArg);
if (!existsSync(productRoot)) {
  console.error(`Product root not found: ${productRoot}`);
  process.exit(1);
}

function walkPackageDirs(dir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  if (existsSync(path.join(dir, "package.json"))) {
    out.push(dir);
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (
      e.name === "node_modules" ||
      e.name === "dist" ||
      e.name === ".git" ||
      e.name.startsWith(".")
    ) {
      continue;
    }
    walkPackageDirs(path.join(dir, e.name), out);
  }
}

const packageDirs: string[] = [];
walkPackageDirs(productRoot, packageDirs);

let updated = 0;
for (const pkgDir of packageDirs) {
  const envTs = path.join(pkgDir, "env.ts");
  if (!existsSync(envTs)) continue;
  if (!statSync(envTs).isFile()) continue;

  const hasCombined = existsSync(
    path.join(pkgDir, "env.schema.combined.json"),
  );
  const args = ["exec", "saf-env", "generate"];
  if (hasCombined) {
    args.push("--", "--combined");
  }

  console.log(`Generating env in ${path.relative(productRoot, pkgDir) || "."}`);
  const result = spawnSync("npm", args, {
    cwd: pkgDir,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`saf-env generate failed in ${pkgDir}`);
    process.exit(result.status ?? 1);
  }
  updated++;
}

console.log(`Regenerated env for ${updated} package(s) under ${productRoot}`);
