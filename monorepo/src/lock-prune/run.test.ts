import { describe, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeProductLockPrune } from "./analyze.ts";
import { runLockPrune } from "./run.ts";
import {
  loadProductFixture,
  readProductFile,
  useProductFixtureLifecycle,
} from "./test-helpers.ts";

useProductFixtureLifecycle();

type Lock = { packages: Record<string, Record<string, unknown>> };

/** A product whose saflib/vue workspace has its own (stale) copy of vite. */
function loadNestedViteProduct(): string {
  return loadProductFixture({
    "/product/package.json": JSON.stringify({
      name: "@product/root",
      workspaces: ["saflib/vue"],
    }),
    "/product/saflib/package.json": JSON.stringify({ name: "@saflib/saflib" }),
    "/product/saflib/vue/package.json": JSON.stringify({
      name: "@saflib/vue",
      dependencies: { vite: "^8.0.0" },
    }),
    "/product/package-lock.json": JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "@product/root", dependencies: { vite: "^8.1.0" } },
        "saflib/vue": { name: "@saflib/vue", dependencies: { vite: "^8.0.0" } },
        "node_modules/vite": { version: "8.1.7" },
        "saflib/vue/node_modules/vite": { version: "8.0.13" },
        "saflib/vue/node_modules/vite/node_modules/rolldown": {
          version: "1.0.0",
        },
      },
    }),
  });
}

function readLock(): Lock {
  return JSON.parse(readProductFile("package-lock.json")) as Lock;
}

describe("workspace alignment issues", () => {
  it("reports nested copies as workspace-misaligned and workspace-duplicate", () => {
    const root = loadNestedViteProduct();
    const lockPath = join(root, "package-lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as Lock;
    lock.packages["node_modules/vue"] = { version: "3.5.45" };
    lock.packages["saflib/vue/node_modules/vue"] = { version: "3.5.45" };
    writeFileSync(lockPath, JSON.stringify(lock));

    const kinds = analyzeProductLockPrune(root).issues.map((i) => i.kind);
    expect(kinds).toContain("workspace-misaligned");
    expect(kinds).toContain("workspace-duplicate");
  });
});

describe("runLockPrune --fix", () => {
  it("removes stale nested copies and re-resolves until clean", async () => {
    const root = loadNestedViteProduct();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const reresolve = vi.fn((dir: string) => {
      // What npm does once both copies are gone: one vite at the root.
      const lockPath = join(dir, "package-lock.json");
      const lock = JSON.parse(readFileSync(lockPath, "utf8")) as Lock;
      lock.packages["node_modules/vite"] = { version: "8.1.7" };
      writeFileSync(lockPath, JSON.stringify(lock));
    });

    const code = await runLockPrune({ rootDir: root, fix: true, reresolve });

    expect(code).toBe(0);
    expect(reresolve).toHaveBeenCalledTimes(1);
    const lock = readLock();
    expect(lock.packages["saflib/vue/node_modules/vite"]).toBeUndefined();
    expect(
      lock.packages["saflib/vue/node_modules/vite/node_modules/rolldown"],
    ).toBeUndefined();
    expect(lock.packages["node_modules/vite"]).toEqual({ version: "8.1.7" });
  });

  it("reports a misalignment npm recreates instead of retrying it", async () => {
    const root = loadNestedViteProduct();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const reresolve = vi.fn((dir: string) => {
      // The ranges really conflict: npm nests the old version again.
      const lockPath = join(dir, "package-lock.json");
      const lock = JSON.parse(readFileSync(lockPath, "utf8")) as Lock;
      lock.packages["node_modules/vite"] = { version: "8.1.7" };
      lock.packages["saflib/vue/node_modules/vite"] = { version: "8.0.13" };
      writeFileSync(lockPath, JSON.stringify(lock));
    });

    const code = await runLockPrune({ rootDir: root, fix: true, reresolve });

    expect(code).toBe(1);
    expect(reresolve).toHaveBeenCalledTimes(1);
  });

  it("only reports without --fix", async () => {
    const root = loadNestedViteProduct();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const reresolve = vi.fn();
    const code = await runLockPrune({ rootDir: root, reresolve });
    expect(code).toBe(1);
    expect(reresolve).not.toHaveBeenCalled();
    expect(readLock().packages["saflib/vue/node_modules/vite"]).toBeDefined();
  });
});
