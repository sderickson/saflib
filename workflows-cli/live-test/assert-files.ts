/**
 * Assert files exist under a disposable product copy.
 * Usage: node assert-files.ts <productName> <relPath> [relPath...]
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const [product, ...files] = process.argv.slice(2);
if (!product || files.length === 0) {
  console.error("Usage: assert-files.ts <productName> <relPath> [relPath...]");
  process.exit(1);
}

const root = path.join(saflibRoot, product);
const missing = files.filter((rel) => !existsSync(path.join(root, rel)));
if (missing.length > 0) {
  console.error(
    `Missing under ${product}/:\n${missing.map((m) => `  - ${m}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(`OK under ${product}/ (${files.length} paths)`);
