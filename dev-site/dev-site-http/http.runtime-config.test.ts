import { describe, it, expect } from "vitest";
import { injectDevSiteRuntimeConfig } from "./http.ts";

describe("injectDevSiteRuntimeConfig", () => {
  it("injects before </head> when present", () => {
    const html = "<!doctype html><html><head><title>x</title></head><body></body></html>";
    const script = '<script>window.__DEV_SITE_CONFIG__={"githubRepo":"acme/widget"}</script>';
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
