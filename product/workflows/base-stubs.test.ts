import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { templatesProductRoot } from "@saflib/templates";

/**
 * Guardrails for expansion stubs in the golden product at `saflib/base`.
 *
 * Checklist / live-test cover workflow mechanics. This catches stubs deleted or
 * live workflow areas emptied so base/dev no longer exercises expansion points.
 */
const stubPaths = [
  "service/spec/routes/__group-name__/__target-name__.yaml",
  "service/spec/schemas/__target-name__.yaml",
  "service/db/schemas/__group-name__.ts",
  "service/db/queries/__group-name__/__target-name__.ts",
  "service/http/handlers/__group-name__/index.ts",
  "service/sdk/requests/__group-name__/__query-name__.ts",
  "service/sdk/requests/__group-name__/__mutation-name__.ts",
  "clients/__subdomain-name__/__group-name__/__TargetName__.vue",
  "clients/__subdomain-name__/e2e/__target-name__/__target-name__.spec.ts",
  "clients/__static-subdomain-name__/package.json",
  "clients/links/__subdomain-name__-links.ts",
] as const;

/** Live hosts whose workflow areas must contain stub tokens (not emptied). */
const filledAreaHosts: { rel: string; mustInclude: string[] }[] = [
  {
    rel: "service/spec/openapi.yaml",
    mustInclude: ["__group-name__", "__target-name__"],
  },
  {
    rel: "service/db/schema.ts",
    mustInclude: ["__group-name__"],
  },
  {
    rel: "service/http/http.ts",
    mustInclude: ["__group-name__", "create__GroupName__Router"],
  },
  {
    rel: "service/sdk/fakes.ts",
    mustInclude: ["__group-name__", "__groupName__FakeHandlers"],
  },
  {
    rel: "clients/__subdomain-name__/router.ts",
    mustInclude: ["__group-name__", "__FullName__Async"],
  },
  {
    rel: "clients/__subdomain-name__/strings.ts",
    mustInclude: ["__full_name__"],
  },
  {
    rel: "clients/links/__subdomain-name__-links.ts",
    mustInclude: ["__fullName__"],
  },
  {
    rel: "clients/links/index.ts",
    mustInclude: ["__subdomainName__Links"],
  },
];

describe("golden product expansion stubs", () => {
  it("keeps stub files under templatesProductRoot", () => {
    for (const rel of stubPaths) {
      const abs = path.join(templatesProductRoot, rel);
      expect(existsSync(abs), `missing stub: ${rel}`).toBe(true);
    }
  });

  it("keeps live workflow areas filled with stub tokens", () => {
    for (const { rel, mustInclude } of filledAreaHosts) {
      const abs = path.join(templatesProductRoot, rel);
      expect(existsSync(abs), `missing host: ${rel}`).toBe(true);
      const content = readFileSync(abs, "utf8");
      for (const token of mustInclude) {
        expect(
          content.includes(token),
          `${rel} should still reference stub token ${token}`,
        ).toBe(true);
      }
    }
  });
});
