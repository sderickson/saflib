import path from "node:path";
import type { Reporter, TestModule } from "vitest/node";
import { measureGraph } from "../graph/walk-graph.ts";
import type { MeasureGraphResult } from "../types.ts";

/**
 * Vitest reporter that prints static import-graph stats after each test file.
 *
 * **Opt-in only** — enable with `IMPORT_GRAPH_REPORT=1` in package vitest config.
 * CI regression checks use `saf-imports baseline diff` / `saf-imports budget`, not
 * this reporter (it re-walks the graph and adds suite overhead).
 *
 * Prefer registering by package name so Vitest loads the module via Vite
 * (plain `vitest.config.js` cannot import `.ts` package exports under Node):
 *
 * ```js
 * reporters: process.env.IMPORT_GRAPH_REPORT === "1"
 *   ? ["default", "@saflib/imports/reporter"]
 *   : ["default"]
 * ```
 */
export class ImportGraphReporter implements Reporter {
  readonly #cache = new Map<string, MeasureGraphResult>();

  onTestModuleEnd(testModule: TestModule): void {
    const filePath = testModule.moduleId;
    if (!filePath || filePath.includes("\0")) return;

    let result = this.#cache.get(filePath);
    if (!result) {
      try {
        result = measureGraph(filePath);
        this.#cache.set(filePath, result);
      } catch {
        return;
      }
    }

    const basename = path.basename(filePath);
    const collectMs = testModule.diagnostic()?.collectDuration;
    const collect =
      collectMs != null && collectMs > 0
        ? `  collect=${(collectMs / 1000).toFixed(2)}s`
        : "";

    console.log(
      `import-graph  ${basename}  modules=${result.modules}  ext=${result.ext}${collect}`,
    );
  }
}

/** Factory for configs that can import TypeScript (e.g. with strip-types). */
export function importGraphReporter(): Reporter {
  return new ImportGraphReporter();
}

export default ImportGraphReporter;
