import { describe, expect, it } from "vitest";
import {
  isSkippedStubRefLine,
  makeProductInitLineReplace,
} from "./init.ts";

/** Minimal context for product/init line-replace unit tests. */
function testContext() {
  return {
    productName: "tmp",
    domainName: "temporary.com",
    productOnly: true,
    organizationName: "saflib",
    sharedPackagePrefix: "@saflib/tmp",
    packageName: "PACKAGE_NAME_UNUSED",
    serviceName: "tmp",
  };
}

describe("isSkippedStubRefLine", () => {
  it("drops package.json deps that still point at skipped stub packages", () => {
    expect(
      isSkippedStubRefLine(
        '    "@saflib/base-__integration-name__-integration": "*",',
      ),
    ).toBe(true);
    expect(
      isSkippedStubRefLine('    "@saflib/base-__offshoot-name__-db": "*",'),
    ).toBe(true);
  });

  it("drops tsconfig path refs to skipped stubs", () => {
    expect(
      isSkippedStubRefLine(
        '      "path": "../integrations/__integration-name__"',
      ),
    ).toBe(true);
    expect(
      isSkippedStubRefLine(
        '{ "path": "../../__offshoot-name__/db" },',
      ),
    ).toBe(true);
  });

  it("notes that multi-line stub refs need strip-stub-tsconfig-refs.ts", () => {
    // Dropping only the path line leaves `{` / `}` behind — product/init runs
    // strip-stub-tsconfig-refs.ts after copy to remove empty objects.
    const lines = [
      "    {",
      '      "path": "../integrations/__integration-name__"',
      "    }",
    ];
    const replace = makeProductInitLineReplace(testContext());
    const out = lines.map(replace).join("\n");
    expect(out).toContain("{");
    expect(out).not.toContain("__integration-name__");
  });

  it("keeps normal dependency and path lines", () => {
    expect(isSkippedStubRefLine('    "@saflib/drizzle": "*",')).toBe(false);
    expect(isSkippedStubRefLine('      "path": "../db"')).toBe(false);
  });

  it("drops import/export lines that reference skipped stub modules", () => {
    expect(
      isSkippedStubRefLine('export * from "./schemas/__group-name__.ts";'),
    ).toBe(true);
    expect(
      isSkippedStubRefLine(
        'export * from "@saflib/base-__offshoot-name__-db/schema";',
      ),
    ).toBe(true);
  });
});

describe("makeProductInitLineReplace", () => {
  const replace = makeProductInitLineReplace(testContext());

  it("strips the SPA stub from CLIENT_SUBDOMAINS", () => {
    expect(replace("CLIENT_SUBDOMAINS=,auth,app,__subdomain-name__")).toBe(
      "CLIENT_SUBDOMAINS=,auth,app",
    );
  });

  it("deletes stub package.json and tsconfig ref lines", () => {
    expect(
      replace('    "@saflib/base-__integration-name__-integration": "*",'),
    ).toBe("");
    expect(
      replace('{ "path": "../../__offshoot-name__/http" },'),
    ).toBe("");
  });

  it("leaves unknown __tokens__ literal (e.g. migration table names)", () => {
    expect(replace("CREATE TABLE `__group_name___table` (")).toBe(
      "CREATE TABLE `__group_name___table` (",
    );
  });

  it("leaves Vite framework defines literal", () => {
    expect(
      replace("      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),"),
    ).toBe("      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),");
  });

  it("strips unresolved stub path segments from Dockerfile COPY lines", () => {
    const line =
      "COPY --parents ./package.json ./saflib/base/service/integrations/__integration-name__/package.json ./saflib/templates/package.json ./";
    const out = replace(line);
    expect(out).toContain("./package.json");
    expect(out).toContain("saflib/templates/package.json");
    expect(out).not.toContain("__integration-name__");
    expect(out).not.toContain("integrations/");
  });

  it("renames product package prefix and domain", () => {
    expect(replace('  "name": "@saflib/base-db",')).toBe(
      '  "name": "@saflib/tmp-db",',
    );
    expect(replace("DOMAIN=example.com")).toBe("DOMAIN=temporary.com");
  });

  it("does not rewrite bare 'base' inside ordinary words", () => {
    expect(replace("const databaseUrl = 'x';")).toBe(
      "const databaseUrl = 'x';",
    );
  });
});
