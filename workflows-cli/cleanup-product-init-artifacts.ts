import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
process.chdir(saflibRoot);

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  workspaces?: string[];
};
pkg.workspaces = (pkg.workspaces ?? []).filter((w) => w !== "tmp/**");
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
