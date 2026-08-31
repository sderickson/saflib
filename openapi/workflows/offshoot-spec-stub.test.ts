import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { offshootStubRoot } from "@saflib/templates";

/**
 * openapi/route runs `npm test -- no-root-response-bodies` in the target
 * spec package (including offshoots from openapi/init). Keep the golden stub
 * runnable so live-test / agent workflows do not hit "Missing script: test".
 */
describe("offshoot spec stub", () => {
  const stubRoot = path.join(offshootStubRoot, "spec");

  it("has vitest test script and guardrail test files", () => {
    const pkgPath = path.join(stubRoot, "package.json");
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(pkg.scripts?.test).toMatch(/vitest/);
    expect(pkg.devDependencies?.["@saflib/vitest"]).toBeDefined();
    expect(existsSync(path.join(stubRoot, "vitest.config.js"))).toBe(true);
    expect(
      existsSync(path.join(stubRoot, "no-root-response-bodies.test.ts")),
    ).toBe(true);
    expect(existsSync(path.join(stubRoot, "operation-tags.test.ts"))).toBe(
      true,
    );
  });

  it("is the same stub openapi/init copies", () => {
    // Guard against drifting the workflow path away from the asserted stub.
    const initSource = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "init.ts"),
      "utf8",
    );
    expect(initSource).toContain('offshootStubRoot, "spec"');
  });
});
