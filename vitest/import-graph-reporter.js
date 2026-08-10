import path from "node:path";
import { fileURLToPath } from "node:url";

const importGraphReporterPath = path.join(
  fileURLToPath(import.meta.url),
  "../../imports/reporter.ts",
);

/**
 * Vitest reporters when `IMPORT_GRAPH_REPORT=1`.
 * Wired from `@saflib/vitest` base config so any package using `defaultConfig` gets opt-in reporting.
 */
export function importGraphReporters() {
  return process.env.IMPORT_GRAPH_REPORT === "1"
    ? ["default", importGraphReporterPath]
    : ["default"];
}

export { importGraphReporterPath };
