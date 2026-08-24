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
  "service/spec/events/__target_name__.yaml",
  "service/db/schemas/__group-name__.ts",
  "service/db/queries/__group-name__/__target-name__.ts",
  "service/http/handlers/__group-name__/index.ts",
  "service/http/routers.ts",
  "__offshoot-name__/http/routers.ts",
  "service/sdk/requests/__group-name__/__query-name__.ts",
  "service/sdk/requests/__group-name__/__mutation-name__.ts",
  "service/sdk/__group-name__/__TargetName__.vue",
  "clients/__subdomain-name__/__group-name__/__TargetName__.vue",
  "clients/__subdomain-name__/e2e/__target-name__/__target-name__.spec.ts",
  "clients/__static-subdomain-name__/package.json",
  "clients/links/__subdomain-name__-links.ts",
  "service/email/emails/__target-name__.ts",
  "service/cron/jobs/__group-name__/__target-name__.ts",
  "service/integrations/__integration-name__/calls/__target-name__.ts",
  "packages/__package-name__/package.json",
  "packages/__package-name__/__group-name__/__target-name__.ts",
  "packages/__package-name__/__group-name__/__target-name__.test.ts",
  "packages/__package-name__/bin/__group-name__/index.ts",
  "packages/__package-name__/workflows/__target-name__.ts",
  "packages/__package-name__/env.schema.json",
  // Phase 5 domain offshoot golden packages
  "__offshoot-name__/db/package.json",
  "__offshoot-name__/db/schemas/__offshoot-name__.ts",
  "__offshoot-name__/spec/package.json",
  "__offshoot-name__/spec/openapi.yaml",
  "__offshoot-name__/http/package.json",
  "__offshoot-name__/http/http.ts",
  "__offshoot-name__/sdk/package.json",
  "__offshoot-name__/sdk/fakes.ts",
  // vue/add-static-site: live docker areas stay empty; tokens live in stubs
  "dev/.workflow-stubs/vue-add-static-site/build-images.sh",
  "dev/.workflow-stubs/vue-add-static-site/Dockerfile.template",
] as const;

/** Live hosts whose workflow areas must contain stub tokens (not emptied). */
const filledAreaHosts: { rel: string; mustInclude: string[] }[] = [
  {
    rel: "service/spec/openapi.yaml",
    mustInclude: [
      "__group-name__",
      "__target-name__",
      "__offshoot-name__",
      "offshoot-paths",
    ],
  },
  {
    rel: "service/spec/events/index.yaml",
    mustInclude: ["__target_name__"],
  },
  {
    rel: "service/sdk/strings.ts",
    mustInclude: ["__full_name__", "__group-name__", "__TargetName__"],
  },
  {
    rel: "service/db/schema.ts",
    mustInclude: [
      "__group-name__",
      "@saflib/base-__offshoot-name__-db",
      "offshoot-schema-exports",
    ],
  },
  {
    rel: "service/http/routers.ts",
    mustInclude: [
      "create__GroupName__Router",
      "router-mounts",
      "groupRouterMounts",
    ],
  },
  {
    rel: "__offshoot-name__/http/routers.ts",
    mustInclude: [
      "create__GroupName__Router",
      "router-mounts",
      "groupRouterMounts",
    ],
  },
  {
    rel: "service/http/http.ts",
    mustInclude: [
      "groupRouterMounts",
      "@saflib/base-__offshoot-name__-http",
      "create__OffshootName__Router",
      "createCronRouter",
      "getBaseCronDbKey",
    ],
  },
  {
    rel: "service/sdk/fakes.ts",
    mustInclude: [
      "__group-name__",
      "__groupName__FakeHandlers",
      "@saflib/base-__offshoot-name__-sdk",
      "__offshootName__FakeHandlers",
    ],
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
  {
    rel: "dev/caddy-config/Caddyfile",
    mustInclude: [
      "__subdomain-name__.docker.localhost",
      "__static-subdomain-name__.docker.localhost",
    ],
  },
  {
    // Live areas intentionally empty (invalid Docker tags); tokens in .workflow-stubs.
    rel: "dev/build-images.sh",
    mustInclude: ["BEGIN WORKFLOW AREA build-static-sites"],
  },
  {
    rel: "dev/Dockerfile.template",
    mustInclude: [
      "BEGIN WORKFLOW AREA static-site-builders",
      "BEGIN WORKFLOW AREA static-site-assets",
    ],
  },
  {
    rel: "dev/.workflow-stubs/vue-add-static-site/build-images.sh",
    mustInclude: ["__static-subdomain-name__"],
  },
  {
    rel: "dev/.workflow-stubs/vue-add-static-site/Dockerfile.template",
    mustInclude: ["__static-subdomain-name__"],
  },
  {
    rel: "service/common/context.ts",
    mustInclude: ["__storeName__"],
  },
  {
    rel: "service/cron/cron.ts",
    mustInclude: ["__groupName__Jobs"],
  },
  {
    rel: "service/integrations/__integration-name__/index.ts",
    mustInclude: ["__targetName__"],
  },
  {
    rel: "service/common/dependencies.ts",
    mustInclude: ["configure__IntegrationName__", "__integration-name__"],
  },
  {
    rel: "service/monolith/index.ts",
    mustInclude: ["runBaseCron"],
  },
  {
    rel: "packages/__package-name__/package.json",
    mustInclude: ["__group-name__"],
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
