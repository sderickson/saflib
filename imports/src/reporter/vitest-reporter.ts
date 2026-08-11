import fs from "node:fs";
import path from "node:path";
import type { Reporter, TestModule } from "vitest/node";
import { measureGraph } from "../graph/walk-graph.ts";
import type { MeasureGraphResult } from "../types.ts";

interface FileRecord {
  relPath: string;
  modules: number;
  ext: number;
  collectMs: number | undefined;
}

function resolveAbsolute(filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

/** Nearest directory containing `package.json` (workspace package root). */
function findPackageRoot(absFilePath: string): string {
  let dir = path.dirname(absFilePath);
  const fsRoot = path.parse(dir).root;
  while (dir !== fsRoot) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function packageRelativePath(filePath: string): string {
  const abs = resolveAbsolute(filePath);
  const rel = path.relative(findPackageRoot(abs), abs);
  return rel.split(path.sep).join("/");
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Vitest reporter that prints static import-graph stats after each test file,
 * plus a run summary (collect timing stats and slowest files).
 *
 * Opt-in via `IMPORT_GRAPH_REPORT=1` (wired from `@saflib/vitest` base config).
 * Root shortcut: `npm run import-graph:report -- <workspace>`.
 */
export class ImportGraphReporter implements Reporter {
  readonly #graphCache = new Map<string, MeasureGraphResult>();
  readonly #files: FileRecord[] = [];

  onTestModuleEnd(testModule: TestModule): void {
    const filePath = testModule.moduleId;
    if (!filePath || filePath.includes("\0")) return;

    let result = this.#graphCache.get(filePath);
    if (!result) {
      try {
        result = measureGraph(filePath);
        this.#graphCache.set(filePath, result);
      } catch {
        return;
      }
    }

    const collectMs = testModule.diagnostic()?.collectDuration;
    const record: FileRecord = {
      relPath: packageRelativePath(filePath),
      modules: result.modules,
      ext: result.ext,
      collectMs:
        collectMs != null && collectMs > 0 ? collectMs : undefined,
    };
    this.#files.push(record);

    const collect =
      record.collectMs != null
        ? `  collect=${formatSeconds(record.collectMs)}`
        : "";

    console.log(
      `import-graph  ${record.relPath}  modules=${record.modules}  ext=${record.ext}${collect}`,
    );
  }

  onTestRunEnd(): void {
    if (this.#files.length === 0) return;

    const collectMs = this.#files
      .map((f) => f.collectMs)
      .filter((ms): ms is number => ms != null);

    console.log("");
    console.log(
      `import-graph summary (${this.#files.length} test file${this.#files.length === 1 ? "" : "s"})`,
    );

    if (collectMs.length > 0) {
      const min = Math.min(...collectMs);
      const max = Math.max(...collectMs);
      console.log(
        `  collect: min=${formatSeconds(min)}  mean=${formatSeconds(mean(collectMs))}  median=${formatSeconds(median(collectMs))}  max=${formatSeconds(max)}  (n=${collectMs.length})`,
      );

      const slowest = [...this.#files]
        .filter((f) => f.collectMs != null)
        .sort((a, b) => b.collectMs! - a.collectMs!)
        .slice(0, 10);

      if (slowest.length > 0) {
        console.log("  slowest collect:");
        for (const [i, file] of slowest.entries()) {
          console.log(
            `    ${i + 1}. ${file.relPath}  collect=${formatSeconds(file.collectMs!)}  modules=${file.modules}  ext=${file.ext}`,
          );
        }
      }
    } else {
      console.log("  collect: (no timing data from Vitest)");
    }

    const byModules = [...this.#files]
      .sort((a, b) => b.modules - a.modules)
      .slice(0, 3);
    if (byModules.length > 0 && byModules[0]!.modules > 0) {
      console.log("  largest graphs:");
      for (const [i, file] of byModules.entries()) {
        const collect =
          file.collectMs != null
            ? `  collect=${formatSeconds(file.collectMs)}`
            : "";
        console.log(
          `    ${i + 1}. ${file.relPath}  modules=${file.modules}  ext=${file.ext}${collect}`,
        );
      }
    }
  }
}

/** Factory for configs that can import TypeScript (e.g. with strip-types). */
export function importGraphReporter(): Reporter {
  return new ImportGraphReporter();
}

export default ImportGraphReporter;
