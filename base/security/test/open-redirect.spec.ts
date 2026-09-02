import { expect, test } from "@playwright/test";
import { kratosPublicOrigin } from "@saflib/security/origins/urls";

/**
 * Kratos must reject off-site return_to values (kratos.yml allowed_return_urls).
 */
const domain = process.env.DOMAIN ?? "docker.localhost";
const protocol = process.env.PROTOCOL ?? "http";

test.describe("open redirect", () => {
  test("Kratos login browser flow rejects external https return_to", async ({
    request,
  }) => {
    const res = await request.get(
      `${kratosPublicOrigin()}/self-service/login/browser?${new URLSearchParams(
        {
          return_to: "https://evil.example/",
        },
      )}`,
      { maxRedirects: 0 },
    );
    if (res.status() >= 400) {
      expect(res.status()).toBeLessThan(500);
      return;
    }
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const loc = res.headers().location ?? "";
    expect(loc.toLowerCase()).not.toContain("evil.example");
  });

  test("Kratos login browser flow accepts same-site app return_to", async ({
    request,
  }) => {
    const okReturn = `${protocol}://app.${domain}/`;
    const res = await request.get(
      `${kratosPublicOrigin()}/self-service/login/browser?${new URLSearchParams(
        {
          return_to: okReturn,
        },
      )}`,
      { maxRedirects: 0 },
    );
    expect([200, 302, 303, 304]).toContain(res.status());
    if (res.status() >= 300 && res.status() < 400) {
      const loc = res.headers()["location"];
      expect(loc).toBeDefined();
      expect(loc!.toLowerCase()).not.toContain("evil.example");
    }
  });

  test("auth SPA never lands on evil host when return_to is external", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto(
      `${protocol}://auth.${domain}/new-login?${new URLSearchParams({
        return_to: "https://evil.example/account",
      })}`,
      { waitUntil: "domcontentloaded" },
    );

    const host = new URL(page.url()).hostname;
    expect(host).not.toBe("evil.example");

    await expect(page.locator("body")).toContainText(
      "self_service_flow_return_to_forbidden",
    );
  });
});
