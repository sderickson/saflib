import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { describe, expect, it } from "vitest";
import {
  generateBaseline,
  diffBaseline,
  formatRegression,
} from "./src/baseline/baseline.ts";

const fixtureRoot = path.join(import.meta.dirname, "fixtures/mini-monorepo");

describe("generateBaseline", () => {
  it("writes a snapshot covering fixture *.test.ts files and entries when present", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-baseline-"));
    const outPath = path.join(tmp, "baseline.json");
    try {
      // Fixture has no *.test.ts — create one that imports pkg-a
      const testDir = path.join(fixtureRoot, "packages/pkg-a");
      const testFile = path.join(testDir, "graph.test.ts");
      const created = !fs.existsSync(testFile);
      if (created) {
        fs.writeFileSync(
          testFile,
          `import { util } from "./src/util.ts";\nexport const t = util;\n`,
        );
      }
      try {
        const snap = generateBaseline({
          root: fixtureRoot,
          outPath,
          skipTimings: true,
          skipBundles: true,
        });
        expect(fs.existsSync(outPath)).toBe(true);
        expect(snap.testFileCount).toBeGreaterThanOrEqual(1);
        expect(snap.tests["packages/pkg-a/graph.test.ts"]?.modules).toBeGreaterThan(
          0,
        );
        expect(snap.typecheck.status).toBe("skipped");
        expect(snap.bundles.status).toBe("skipped");
      } finally {
        if (created) fs.unlinkSync(testFile);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("diffBaseline", () => {
  it("reports module regressions above 5%", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-diff-"));
    try {
      const baselinePath = path.join(tmp, "baseline.json");
      const testDir = path.join(fixtureRoot, "packages/pkg-a");
      const testFile = path.join(testDir, "diff.test.ts");
      fs.writeFileSync(
        testFile,
        `import { util } from "./src/util.ts";\nexport const t = util;\n`,
      );
      try {
        generateBaseline({
          root: fixtureRoot,
          outPath: baselinePath,
          skipTimings: true,
          skipBundles: true,
        });

        // Inflate baseline so current looks like a regression when we re-measure…
        // Actually: shrink baseline modules so current > baseline * 1.05
        const snap = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
        const key = "packages/pkg-a/diff.test.ts";
        const actual = snap.tests[key].modules;
        snap.tests[key].modules = Math.max(1, Math.floor(actual / 2));
        fs.writeFileSync(baselinePath, JSON.stringify(snap, null, 2));

        const { regressions } = diffBaseline({
          baselinePath,
          root: fixtureRoot,
        });
        expect(regressions.some((r) => r.kind === "modules" && r.path === key)).toBe(
          true,
        );
        expect(formatRegression(regressions[0]!)).toMatch(/modules/);
      } finally {
        fs.unlinkSync(testFile);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
