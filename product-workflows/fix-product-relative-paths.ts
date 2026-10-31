#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * After product/init copies base/product → <product>, relative paths that
 * climb out of the product still have the golden tree's depth: base/product
 * sits two levels below saflib's root, a product one level below its repo
 * root. For a file `depth` directories below the product root, a golden path
 * climbing `depth + 2` levels reaches saflib's root; in the product that's
 * `depth + 1` levels to the repo root, plus `saflib/` when saflib is embedded
 * (a submodule beside the product). Bare root paths (compose build contexts,
 * vite's monorepo root) mean the repo root itself, so they get no `saflib/`.
 *
 * Usage: node fix-product-relative-paths.ts <productRoot> <embedded: 0|1>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEXT_EXTENSIONS = new Set([
  ".ts", ".mts", ".js", ".mjs", ".cjs", ".vue", ".json", ".yaml", ".yml",
  ".md", ".html", ".css", ".scss", ".sh", ".template", ".Caddyfile",
]);
const TEXT_BASENAMES = new Set(["Caddyfile", "Dockerfile"]);

/** A run of `../` segments, ending at a `/` or a delimiter. */
const RELATIVE_RUN = /(?<![\w./-])((?:\.\.\/)*\.\.)(?=(\/)|["'`\s),:;]|$)/g;

/**
 * Rewrite one file's text, given its depth below the product root.
 * Paths that stay inside the product are left alone.
 */
export function fixRelativePaths(
  text: string,
  depth: number,
  embedded: boolean,
): string {
  return text.replace(
    RELATIVE_RUN,
    (run: string, _whole: string, slash: string | undefined) => {
      const levels = run.split("/").length;
      if (levels < depth + 2) return run;
      const productRun = Array(levels - 1).fill("..").join("/");
      const toSaflibRoot = levels === depth + 2;
      return embedded && toSaflibRoot && slash ? `${productRun}/saflib` : productRun;
    },
  );
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (
      TEXT_EXTENSIONS.has(path.extname(entry.name)) ||
      TEXT_BASENAMES.has(entry.name) ||
      entry.name.startsWith("env.")
    ) {
      out.push(full);
    }
  }
  return out;
}

function main(productRoot: string, embedded: boolean): void {
  const root = path.resolve(productRoot);
  let changed = 0;
  for (const file of walk(root)) {
    const depth = path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean).length;
    const text = fs.readFileSync(file, "utf8");
    const fixed = fixRelativePaths(text, depth, embedded);
    if (fixed !== text) {
      fs.writeFileSync(file, fixed);
      changed += 1;
    }
  }
  console.log(`fix-product-relative-paths: ${changed} file(s) updated`);
}

const invokedAsCli =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (invokedAsCli) {
  const [productRoot, embedded] = process.argv.slice(2);
  if (!productRoot || !["0", "1"].includes(embedded ?? "")) {
    console.error("Usage: fix-product-relative-paths.ts <productRoot> <embedded: 0|1>");
    process.exit(1);
  }
  main(productRoot, embedded === "1");
}
