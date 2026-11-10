import { describe, expect, it, vi } from "vitest";
import { runSaflibBump } from "./run.ts";
import {
  loadProductFixture,
  readProductFile,
  useProductFixtureLifecycle,
} from "../lock-prune/test-helpers.ts";

useProductFixtureLifecycle();

function loadProduct(): string {
  return loadProductFixture({
    "/product/package.json": JSON.stringify({
      name: "@product/root",
      overrides: { vue: "3.5.20", "product-only": "1.0.0" },
    }),
    "/product/package-lock.json": JSON.stringify({
      lockfileVersion: 3,
      packages: {},
    }),
    "/product/saflib/package.json": JSON.stringify({
      name: "@saflib/saflib",
      overrides: { vue: "3.5.45", editorconfig: { commander: "^15.0.0" } },
    }),
  });
}

/** Fake git/npm: HEAD is `old`, the target is `new`; records each call. */
function fakeExec(options: { forward: boolean }) {
  const calls: string[] = [];
  const exec = (command: string, args: string[]) => {
    calls.push(`${command} ${args.join(" ")}`);
    if (args[0] === "rev-parse") return args[2] === "HEAD" ? "old\n" : "new\n";
    if (args[0] === "merge-base" && !options.forward)
      throw new Error("not an ancestor");
    if (args[0] === "log") return "new Some saflib change\n";
    return "";
  };
  return { calls, exec };
}

describe("runSaflibBump", () => {
  it("fetches, moves forward, copies overrides, re-resolves and runs lock-prune --fix", async () => {
    const root = loadProduct();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { calls, exec } = fakeExec({ forward: true });
    const lockPrune = vi.fn(async () => 0);

    expect(await runSaflibBump({ rootDir: root, exec, lockPrune })).toBe(0);

    expect(calls[0]).toBe("git fetch --quiet origin");
    expect(calls).toContain("git checkout --quiet --detach new");
    expect(calls).toContain(
      "npm install --package-lock-only --ignore-scripts --no-audit --no-fund",
    );
    expect(lockPrune).toHaveBeenCalledWith(root);
    const pkg = JSON.parse(readProductFile("package.json")) as {
      overrides: Record<string, unknown>;
    };
    expect(pkg.overrides).toEqual({
      vue: "3.5.45",
      "product-only": "1.0.0",
      editorconfig: { commander: "^15.0.0" },
    });
  });

  it("refuses to move saflib backwards (e.g. an unfetched, stale ref)", async () => {
    const root = loadProduct();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { calls, exec } = fakeExec({ forward: false });
    const lockPrune = vi.fn(async () => 0);

    expect(await runSaflibBump({ rootDir: root, exec, lockPrune })).toBe(1);
    expect(calls.some((call) => call.startsWith("git checkout"))).toBe(false);
    expect(lockPrune).not.toHaveBeenCalled();
  });
});
