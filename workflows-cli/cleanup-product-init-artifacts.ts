import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Undo saflib-root mutations from product/init when live-testing inside the
 * saflib repo (product name `tmp`). Golden files must stay commit-clean.
 */
const saflibRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
process.chdir(saflibRoot);

const LIVE_TEST_PRODUCT = "tmp";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  workspaces?: string[];
};
pkg.workspaces = (pkg.workspaces ?? []).filter(
  (w) => w !== `${LIVE_TEST_PRODUCT}/**`,
);
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

/**
 * Strip live-test product lines from a product/init workflow area, keeping the
 * area markers and any other (non-tmp) body lines.
 */
function stripLiveTestProductFromWorkflowArea(
  filePath: string,
  areaName: string,
): void {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split("\n");
  const beginRe = new RegExp(
    `BEGIN\\b.*WORKFLOW AREA ${areaName} FOR product/init`,
  );
  const endRe = /END WORKFLOW AREA/;
  const productLineRe = new RegExp(
    `^\\s*-\\s+${LIVE_TEST_PRODUCT}\\s*$`,
  );

  let inArea = false;
  const out: string[] = [];
  for (const line of lines) {
    if (beginRe.test(line)) {
      inArea = true;
      out.push(line);
      continue;
    }
    if (inArea && endRe.test(line)) {
      inArea = false;
      out.push(line);
      continue;
    }
    if (inArea && productLineRe.test(line)) {
      continue;
    }
    out.push(line);
  }
  writeFileSync(filePath, out.join("\n"));
}

stripLiveTestProductFromWorkflowArea(
  ".github/workflows/unit-tests.yaml",
  "test-product-dependencies",
);
