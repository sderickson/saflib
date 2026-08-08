import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  workspaces?: string[];
};
pkg.workspaces = (pkg.workspaces ?? []).filter((w) => w !== "tmp/**");
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
