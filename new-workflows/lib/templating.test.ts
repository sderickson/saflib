import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getPackageName,
  parsePackageName,
  parsePath,
  makeLineReplace,
  isSkippedStubRefLine,
} from "./templating.ts";

describe("getPackageName", () => {
  it("reads the name from package.json", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "templating-"));
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "@foo/bar-db" }, null, 2),
    );
    expect(getPackageName(dir)).toBe("@foo/bar-db");
  });

  it("returns empty string when package.json is missing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "templating-"));
    expect(getPackageName(dir)).toBe("");
  });
});

describe("parsePackageName", () => {
  it("splits a scoped package name with a required suffix", () => {
    expect(parsePackageName("@foo/bar-db", { requiredSuffix: "-db" })).toEqual({
      packageName: "@foo/bar-db",
      serviceName: "bar",
      organizationName: "foo",
      sharedPackagePrefix: "@foo/bar",
    });
  });

  it("throws when the suffix doesn't match", () => {
    expect(() => parsePackageName("@foo/bar-http", { requiredSuffix: "-db" })).toThrow();
  });

  it("doesn't throw with silentError even without the suffix", () => {
    expect(
      parsePackageName("@mock/package-db", { requiredSuffix: "-db", silentError: false }),
    ).toMatchObject({ serviceName: "package" });
  });
});

describe("parsePath", () => {
  it("splits a grouped path with prefix/suffix", () => {
    expect(
      parsePath("./queries/contacts/get-by-id.ts", {
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
        cwd: "/repo/pkg",
      }),
    ).toEqual({
      groupName: "contacts",
      targetName: "get-by-id",
      targetDir: "/repo/pkg/queries/contacts",
    });
  });

  it("uses the target name as the group name when there's no subgroup", () => {
    expect(
      parsePath("./queries/get-by-id.ts", {
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
        cwd: "/repo/pkg",
      }),
    ).toMatchObject({ groupName: "get-by-id", targetName: "get-by-id" });
  });

  it("throws when the required prefix is missing", () => {
    expect(() =>
      parsePath("./other/thing.ts", { requiredPrefix: "./queries/", cwd: "/repo" }),
    ).toThrow();
  });
});

describe("makeLineReplace", () => {
  it("substitutes kebab/camel/Pascal/snake/SNAKE variants", () => {
    const lineReplace = makeLineReplace({ targetName: "get-by-id" });
    expect(lineReplace("const x = __target-name__;")).toBe("const x = get-by-id;");
    expect(lineReplace("const __targetName__ = 1;")).toBe("const getById = 1;");
    expect(lineReplace("class __TargetName__ {}")).toBe("class GetById {}");
    expect(lineReplace("const __target_name__ = 1;")).toBe("const get_by_id = 1;");
    expect(lineReplace("const __TARGET_NAME__ = 1;")).toBe("const GET_BY_ID = 1;");
  });

  it("substitutes template-package via sharedPackagePrefix", () => {
    const lineReplace = makeLineReplace({ sharedPackagePrefix: "@foo/bar" });
    expect(lineReplace('import x from "template-package";')).toBe(
      'import x from "@foo/bar";',
    );
  });

  it("throws on an unresolved placeholder", () => {
    const lineReplace = makeLineReplace({ targetName: "get-by-id" });
    expect(() => lineReplace("const __other-thing__ = 1;")).toThrow(/Missing replacement/);
  });

  it("drops a package.json dependency line referencing a skipped stub, instead of throwing", () => {
    const lineReplace = makeLineReplace({ serviceName: "widgets-common" });
    expect(
      lineReplace('    "@saflib/base-__integration-name__-integration": "*",'),
    ).toBe("");
  });

  it("drops a tsconfig project reference to a skipped stub, instead of throwing", () => {
    const lineReplace = makeLineReplace({ serviceName: "widgets-common" });
    expect(lineReplace('{ "path": "../integrations/__integration-name__" }')).toBe("");
    expect(lineReplace('      "path": "../integrations/__integration-name__"')).toBe(
      "",
    );
  });

  it("drops a JS/TS import from a skipped stub module, instead of throwing", () => {
    const lineReplace = makeLineReplace({ serviceName: "widgets-common" });
    expect(
      lineReplace(
        "import { configure__IntegrationName__ } from \"@saflib/base-__integration-name__-integration\";",
      ),
    ).toBe("");
  });

  it("still resolves a legitimately-templated import (not a skipped-stub reference)", () => {
    const lineReplace = makeLineReplace({ serviceName: "identity-db" });
    expect(lineReplace("import { __service-name__ } from './__service-name__'")).toBe(
      "import { identity-db } from './identity-db'",
    );
  });
});

describe("isSkippedStubRefLine", () => {
  it("matches package.json dependency, tsconfig path, and import/export from lines", () => {
    expect(
      isSkippedStubRefLine('"@saflib/base-__integration-name__-integration": "*"'),
    ).toBe(true);
    expect(isSkippedStubRefLine('"path": "../integrations/__integration-name__"')).toBe(
      true,
    );
    expect(isSkippedStubRefLine("export { x } from './__group-name__/index.ts';")).toBe(
      true,
    );
  });

  it("does not match lines with no __xxx__ token at all", () => {
    expect(isSkippedStubRefLine('"@saflib/base-cron": "*"')).toBe(false);
    expect(isSkippedStubRefLine("import { x } from './y.ts'")).toBe(false);
  });

  it("does not match a Caddy-style import with no `from` keyword", () => {
    expect(isSkippedStubRefLine("import __product-name__.Caddyfile")).toBe(false);
  });
});
