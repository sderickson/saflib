import { describe, expect, it } from "vitest";
import {
  classifySafPackage,
  hasSdkRequestsExport,
  isPackageKind,
  parseSafPackageJson,
} from "./package-kind.ts";

describe("isPackageKind", () => {
  it("accepts known kinds", () => {
    expect(isPackageKind("db")).toBe(true);
    expect(isPackageKind("spec")).toBe(true);
    expect(isPackageKind("nope")).toBe(false);
  });
});

describe("parseSafPackageJson", () => {
  it("parses objects and rejects junk", () => {
    expect(parseSafPackageJson('{"name":"@scope/db"}')?.name).toBe("@scope/db");
    expect(parseSafPackageJson("not-json")).toBeUndefined();
    expect(parseSafPackageJson("[]")).toBeUndefined();
  });
});

describe("hasSdkRequestsExport", () => {
  it("detects ./requests subpaths", () => {
    expect(hasSdkRequestsExport({ "./requests/*": "./requests/*.ts" })).toBe(
      true,
    );
    expect(hasSdkRequestsExport({ ".": "./index.ts" })).toBe(false);
    expect(hasSdkRequestsExport("./index.ts")).toBe(false);
  });
});

describe("classifySafPackage", () => {
  it("uses saf.kind when present", () => {
    expect(
      classifySafPackage({
        name: "@scope/cron",
        saf: { kind: "lib" },
        dependencies: { "@saflib/drizzle": "*" },
      }).kind,
    ).toBe("lib");
  });

  it("infers from a unique identifier dependency", () => {
    expect(
      classifySafPackage({
        name: "@scope/billing-db",
        dependencies: { "@saflib/drizzle": "*" },
      }).kind,
    ).toBe("db");
    expect(
      classifySafPackage({
        name: "@scope/billing-http",
        dependencies: { "@saflib/express": "*" },
      }).kind,
    ).toBe("http");
    expect(
      classifySafPackage({
        name: "@scope/billing-spec",
        dependencies: { "@saflib/openapi": "*" },
      }).kind,
    ).toBe("spec");
    expect(
      classifySafPackage({
        name: "@scope/account-spa",
        dependencies: { "@saflib/vue": "*" },
      }).kind,
    ).toBe("spa");
    expect(
      classifySafPackage({
        name: "@scope/billing-sdk",
        dependencies: { "@saflib/sdk": "*" },
      }).kind,
    ).toBe("sdk");
  });

  it("treats identifier packages themselves as lib", () => {
    expect(
      classifySafPackage({
        name: "@saflib/drizzle",
        dependencies: {},
      }).kind,
    ).toBe("lib");
    expect(
      classifySafPackage({
        name: "@saflib/express",
        dependencies: { "@saflib/openapi": "*" },
      }),
    ).toEqual({ kind: "lib", mixedIdentifiers: [] });
    expect(
      classifySafPackage({
        name: "@saflib/vue",
        dependencies: { "@saflib/sdk": "*" },
      }).kind,
    ).toBe("lib");
  });

  it("flags mixed layer identifiers and does not infer a kind", () => {
    expect(
      classifySafPackage({
        name: "@scope/http-and-db",
        dependencies: {
          "@saflib/drizzle": "*",
          "@saflib/express": "*",
        },
      }),
    ).toEqual({
      kind: "other",
      mixedIdentifiers: ["@saflib/drizzle", "@saflib/express"],
    });
  });

  it("keeps saf.kind when layers are mixed", () => {
    expect(
      classifySafPackage({
        name: "@scope/http-and-db",
        saf: { kind: "http" },
        dependencies: {
          "@saflib/drizzle": "*",
          "@saflib/express": "*",
        },
      }),
    ).toEqual({
      kind: "http",
      mixedIdentifiers: ["@saflib/drizzle", "@saflib/express"],
    });
  });

  it("splits sdk vs spa when both client identifiers are present", () => {
    expect(
      classifySafPackage({
        name: "@scope/billing-sdk",
        dependencies: { "@saflib/sdk": "*", "@saflib/vue": "*" },
        exports: { "./requests/*": "./requests/*.ts" },
      }).kind,
    ).toBe("sdk");
    expect(
      classifySafPackage({
        name: "@scope/app-spa",
        dependencies: { "@saflib/sdk": "*", "@saflib/vue": "*" },
        exports: { ".": "./main.ts" },
      }).kind,
    ).toBe("spa");
  });

  it("does not infer from missing identifier deps", () => {
    expect(
      classifySafPackage({
        name: "@scope/lib",
        dependencies: { "@saflib/git": "*" },
      }).kind,
    ).toBe("other");
  });
});
