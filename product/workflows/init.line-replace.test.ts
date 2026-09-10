import { describe, expect, it } from "vitest";
import {
  isSkippedStubRefLine,
  makeProductInitLineReplace,
  type InitProductWorkflowContext,
} from "./init.ts";

/** Minimal context for product/init line-replace unit tests. */
function testContext(
  overrides: Partial<InitProductWorkflowContext> = {},
): InitProductWorkflowContext {
  return {
    productName: "tmp",
    domainName: "temporary.com",
    productOnly: true,
    organizationName: "saflib",
    sharedPackagePrefix: "@saflib/tmp",
    packageName: "PACKAGE_NAME_UNUSED",
    serviceName: "tmp",
    embeddedProductMonorepo: true,
    ...overrides,
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

  it("keeps Caddy import directives that use product placeholders", () => {
    expect(
      isSkippedStubRefLine("import __product-name__.Caddyfile"),
    ).toBe(false);
    expect(
      isSkippedStubRefLine(
        "\timport spa /__product-name__-clients {args[0]}",
      ),
    ).toBe(false);
    expect(
      isSkippedStubRefLine(
        "\timport kratos-api-proxy {$__PRODUCT_NAME___SERVICE_HTTP_HOST}",
      ),
    ).toBe(false);
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

  it("interpolates Caddy product import directives", () => {
    expect(replace("import __product-name__.Caddyfile")).toBe(
      "import tmp.Caddyfile",
    );
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

  it("keeps and interpolates known placeholders in Dockerfile COPY lines", () => {
    expect(
      replace(
        "COPY ./deploy/__product-name__/env.defaults /etc/__product-name__/env.defaults",
      ),
    ).toBe("COPY ./deploy/tmp/env.defaults /etc/tmp/env.defaults");
  });

  it("drops COPY lines that only referenced unknown stub paths", () => {
    expect(
      replace(
        "COPY --from=static-subdomain-name-static-builder /app/__product-name__/clients/__static-subdomain-name__/.vitepress/dist /srv/__product-name__-__static-subdomain-name__",
      ),
    ).toBe("");
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

  it("does not rewrite CSP base-uri when renaming the product", () => {
    expect(replace("base-uri 'self';")).toBe("base-uri 'self';");
    expect(
      replace(
        "connect-src 'self' {$CSP_CONNECT_SRC}; base-uri 'self'; form-action 'self'",
      ),
    ).toBe(
      "connect-src 'self' {$CSP_CONNECT_SRC}; base-uri 'self'; form-action 'self'",
    );
  });

  it("renames Caddy spa / kratos-api-proxy import lines", () => {
    expect(replace("\timport spa /__product-name__-clients {args[0]}")).toBe(
      "\timport spa /tmp-clients {args[0]}",
    );
    expect(
      replace("\timport kratos-api-proxy {$__PRODUCT_NAME___SERVICE_HTTP_HOST}"),
    ).toBe("\timport kratos-api-proxy {$TMP_SERVICE_HTTP_HOST}");
  });

  it("renames kratos courier/action monolith host placeholders", () => {
    expect(
      replace("url: http://__product-name__-monolith:3000/email/kratos-courier"),
    ).toBe("url: http://tmp-monolith:3000/email/kratos-courier");
    expect(
      replace(
        "COURIER_HTTP_REQUEST_CONFIG_URL=http://__product-name__-monolith:3000/email/kratos-courier",
      ),
    ).toBe(
      "COURIER_HTTP_REQUEST_CONFIG_URL=http://tmp-monolith:3000/email/kratos-courier",
    );
  });

  it("preserves shared tsconfig preset filenames when renaming the product", () => {
    expect(
      replace('    "../../../vue/tsconfig.app.base.json"'),
    ).toBe('    "../../../saflib/vue/tsconfig.app.base.json"');
  });

  it("keeps saflib/vue paths literal when init runs inside @saflib/saflib", () => {
    const standalone = makeProductInitLineReplace(
      testContext({ embeddedProductMonorepo: false }),
    );
    expect(
      standalone('    "../../../vue/tsconfig.app.base.json"'),
    ).toBe('    "../../../vue/tsconfig.app.base.json"');
  });

  it("does not rewrite tsconfig.base.json preset paths", () => {
    expect(replace('  "extends": "../monorepo/tsconfig.base.json"')).toBe(
      '  "extends": "../monorepo/tsconfig.base.json"',
    );
  });
});
