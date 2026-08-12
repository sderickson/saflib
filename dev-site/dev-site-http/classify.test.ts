import { describe, it, expect } from "vitest";
import {
  isSourcePath,
  isTestSourcePath,
  countLines,
  packageRootsFromPackageJsonPaths,
  packageForPath,
  parsePackageName,
} from "./classify.ts";

describe("classify", () => {
  describe("isSourcePath", () => {
    it("accepts ts/vue/js under normal dirs", () => {
      expect(isSourcePath("src/foo.ts")).toBe(true);
      expect(isSourcePath("pkg/Bar.vue")).toBe(true);
      expect(isSourcePath("a.js")).toBe(true);
    });

    it("rejects node_modules, dist, .d.ts, and dotfiles", () => {
      expect(isSourcePath("node_modules/x/a.ts")).toBe(false);
      expect(isSourcePath("pkg/dist/a.ts")).toBe(false);
      expect(isSourcePath("src/a.d.ts")).toBe(false);
      expect(isSourcePath(".hidden/a.ts")).toBe(false);
    });
  });

  describe("isTestSourcePath", () => {
    it("detects *.test.* / *.spec.* and tests/ dirs", () => {
      expect(isTestSourcePath("a.test.ts", "a.test.ts")).toBe(true);
      expect(isTestSourcePath("b.spec.tsx", "b.spec.tsx")).toBe(true);
      expect(isTestSourcePath("tests/foo.ts", "foo.ts")).toBe(true);
      expect(isTestSourcePath("src/foo.ts", "foo.ts")).toBe(false);
    });
  });

  describe("countLines", () => {
    it("counts lines including a final non-newline-terminated line", () => {
      expect(countLines("")).toBe(0);
      expect(countLines("a")).toBe(1);
      expect(countLines("a\n")).toBe(1);
      expect(countLines("a\nb")).toBe(2);
      expect(countLines("a\nb\n")).toBe(2);
    });
  });

  describe("package assignment", () => {
    it("prefers the longest package.json directory prefix", () => {
      const nameByPath = new Map([
        ["package.json", "@root/app"],
        ["packages/a/package.json", "@scope/a"],
        ["packages/a/nested/package.json", "@scope/nested"],
      ]);
      const roots = packageRootsFromPackageJsonPaths(
        [...nameByPath.keys()],
        nameByPath,
      );
      expect(packageForPath("packages/a/nested/x.ts", roots).packageName).toBe(
        "@scope/nested",
      );
      expect(packageForPath("packages/a/y.ts", roots).packageName).toBe(
        "@scope/a",
      );
      expect(packageForPath("z.ts", roots).packageName).toBe("@root/app");
    });

    it("parses package.json name", () => {
      expect(parsePackageName('{"name":"@x/y"}')).toBe("@x/y");
      expect(parsePackageName("not-json")).toBeUndefined();
    });
  });
});
