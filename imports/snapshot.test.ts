import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { describe, expect, it } from "vitest";
import {
  generateSnapshot,
  checkSnapshot,
  formatRegression,
} from "./src/snapshot/snapshot.ts";

const fixtureRoot = path.join(import.meta.dirname, "fixtures/mini-monorepo");

describe("generateSnapshot", () => {
  it("writes a snapshot covering fixture *.test.ts files and entries when present", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-snapshot-"));
    const outPath = path.join(tmp, "snapshot.json");
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
        const snap = generateSnapshot({
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

describe("checkSnapshot", () => {
  it("reports module regressions above 5%", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "saf-imports-check-"));
    try {
      const snapshotPath = path.join(tmp, "snapshot.json");
      const testDir = path.join(fixtureRoot, "packages/pkg-a");
      const testFile = path.join(testDir, "diff.test.ts");
      fs.writeFileSync(
        testFile,
        `import { util } from "./src/util.ts";\nexport const t = util;\n`,
      );
      try {
        generateSnapshot({
          root: fixtureRoot,
          outPath: snapshotPath,
          skipTimings: true,
          skipBundles: true,
        });

        const snap = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
        const key = "packages/pkg-a/diff.test.ts";
        const actual = snap.tests[key].modules;
        snap.tests[key].modules = Math.max(1, Math.floor(actual / 2));
        fs.writeFileSync(snapshotPath, JSON.stringify(snap, null, 2));

        const { regressions } = checkSnapshot({
          againstPath: snapshotPath,
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
