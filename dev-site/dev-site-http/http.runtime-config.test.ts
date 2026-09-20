import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { injectDevSiteRuntimeConfig, createDevSiteHttpApp } from "./http.ts";
import { releaseSlimRouteTest } from "./testing/slim-route-test.ts";

describe("injectDevSiteRuntimeConfig", () => {
  it("injects before </head> when present", () => {
    const html = "<!doctype html><html><head><title>x</title></head><body></body></html>";
    const script =
      '<script>window.__DEV_SITE_CONFIG__={"github_repo":"acme/widget","repo_root":"/repo"}</script>';
    expect(injectDevSiteRuntimeConfig(html, script)).toBe(
      `<!doctype html><html><head><title>x</title>${script}</head><body></body></html>`,
    );
  });

  it("prepends when </head> is missing", () => {
    const html = "<html><body></body></html>";
    const script = "<script></script>";
    expect(injectDevSiteRuntimeConfig(html, script)).toBe(`${script}${html}`);
  });
});

describe("runtime config script vs. CSP (regression: helmet's default script-src blocked it)", () => {
  const staticDir = mkdtempSync(join(tmpdir(), "dev-site-static-"));
  writeFileSync(
    join(staticDir, "index.html"),
    "<!doctype html><html><head><title>x</title></head><body></body></html>",
  );

  afterAll(() => {
    rmSync(staticDir, { recursive: true, force: true });
  });

  it("the injected inline script's nonce is allow-listed in this response's own CSP header", async () => {
    const lease = createDevSiteHttpApp({
      staticDir,
      github_repo: "acme/widget",
      mounts: [],
    });
    try {
      const response = await request(lease.app).get("/");
      expect(response.status).toBe(200);

      const nonceMatch = response.text.match(/<script nonce="([^"]+)">/);
      expect(nonceMatch).not.toBeNull();
      expect(response.text).toContain("window.__DEV_SITE_CONFIG__");

      const csp = response.headers["content-security-policy"];
      expect(csp).toContain(`'nonce-${nonceMatch![1]}'`);
      // The rest of helmet's default policy is untouched, not replaced.
      expect(csp).toContain("object-src 'none'");
    } finally {
      releaseSlimRouteTest(lease);
    }
  });

  it("nonces differ per response — not reused across requests", async () => {
    const lease = createDevSiteHttpApp({
      staticDir,
      github_repo: "acme/widget",
      mounts: [],
    });
    try {
      const first = await request(lease.app).get("/");
      const second = await request(lease.app).get("/");
      const firstNonce = first.text.match(/<script nonce="([^"]+)">/)![1];
      const secondNonce = second.text.match(/<script nonce="([^"]+)">/)![1];
      expect(firstNonce).not.toBe(secondNonce);
    } finally {
      releaseSlimRouteTest(lease);
    }
  });
});
