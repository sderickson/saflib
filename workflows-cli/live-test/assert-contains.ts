/**
 * Assert a file contains substrings.
 * Usage: node assert-contains.ts <relPathFromSaflib> <needle> [needle...]
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const [rel, ...needles] = process.argv.slice(2);
if (!rel || needles.length === 0) {
  console.error(
    "Usage: assert-contains.ts <relPathFromSaflib> <needle> [needle...]",
  );
  process.exit(1);
}

const abs = path.join(saflibRoot, rel);
if (!existsSync(abs)) {
  console.error(`Missing file: ${rel}`);
  process.exit(1);
}

const content = readFileSync(abs, "utf8");
const missing = needles.filter((n) => !content.includes(n));
if (missing.length > 0) {
  console.error(
    `${rel} missing:\n${missing.map((m) => `  - ${m}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(`OK contains in ${rel} (${needles.length} needles)`);
