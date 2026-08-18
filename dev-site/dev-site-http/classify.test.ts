import { describe, it, expect } from "vitest";
import {
  isSourcePath,
  isScaffoldTemplatePath,
  isTestSourcePath,
  countLines,
  packageRootsFromPackageJsonPaths,
  packageForPath,
  parsePackageName,
  sdkRequestFromSpecifier,
} from "./classify.ts";

describe("classify", () => {
  describe("isSourcePath", () => {
    it("accepts ts/vue/js under normal dirs", () => {
      expect(isSourcePath("src/foo.ts")).toBe(true);
      expect(isSourcePath("pkg/Bar.vue")).toBe(true);
      expect(isSourcePath("a.js")).toBe(true);
      expect(isSourcePath("pkg/spec/openapi.yaml")).toBe(true);
      expect(isSourcePath("pkg/spec/routes/billing/get.yaml")).toBe(true);
    });

    it("rejects node_modules, dist, .d.ts, lockfiles, and dotfiles", () => {
      expect(isSourcePath("node_modules/x/a.ts")).toBe(false);
      expect(isSourcePath("pkg/dist/a.ts")).toBe(false);
      expect(isSourcePath("pkg/dist/openapi.yaml")).toBe(false);
      expect(isSourcePath("src/a.d.ts")).toBe(false);
      expect(isSourcePath(".hidden/a.ts")).toBe(false);
      expect(isSourcePath("pnpm-lock.yaml")).toBe(false);
    });
  });

  describe("isTestSourcePath", () => {
    it("detects *.test.* / *.spec.* / *.fixture(s).* / *.test-helpers.* and testing/tests dirs", () => {
      expect(isTestSourcePath("a.test.ts", "a.test.ts")).toBe(true);
      expect(isTestSourcePath("b.spec.tsx", "b.spec.tsx")).toBe(true);
      expect(
        isTestSourcePath("x/m5.fixtures.ts", "m5.fixtures.ts"),
      ).toBe(true);
      expect(
        isTestSourcePath("pages/Home.fixture.ts", "Home.fixture.ts"),
      ).toBe(true);
      expect(
        isTestSourcePath(
          "pages/PreviewTab.test-helpers.ts",
          "PreviewTab.test-helpers.ts",
        ),
      ).toBe(true);
      expect(isTestSourcePath("tests/foo.ts", "foo.ts")).toBe(true);
      expect(isTestSourcePath("pkg/testing/slim-route-test.ts", "slim-route-test.ts")).toBe(
        true,
      );
      expect(isTestSourcePath("src/foo.ts", "foo.ts")).toBe(false);
    });
  });

  describe("isScaffoldTemplatePath", () => {
    it("detects __placeholder__ path segments", () => {
      expect(
        isScaffoldTemplatePath("handlers/__group-name__/index.ts"),
      ).toBe(true);
      expect(isScaffoldTemplatePath("handlers/matters/index.ts")).toBe(false);
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

  describe("sdkRequestFromSpecifier", () => {
    it("parses package/requests/stem specifiers", () => {
      expect(
        sdkRequestFromSpecifier("@scope/billing/requests/orgs/list"),
      ).toEqual({
        sdkPackageName: "@scope/billing",
        requestStem: "orgs/list",
      });
      expect(sdkRequestFromSpecifier("./ChooseOrg.logic.ts")).toBeNull();
    });
  });
});
