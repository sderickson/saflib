import { expect, test } from "@playwright/test";
import { apiOrigin, appOrigin } from "@saflib/security/origins/urls";

const api = apiOrigin();
const app = appOrigin();

test.describe("information disclosure", () => {
  test("/health exposes only OK text", async ({ request }) => {
    const res = await request.get(`${api}/health`);
    expect(res.status()).toBe(200);
    const text = (await res.text()).trim();
    expect(text).toBe("OK");
    expect(text.toLowerCase()).not.toMatch(/sha|commit|version/i);
  });

  test("JSON errors omit stack traces", async ({ request }) => {
    /** Public unsubscribe skips forward_auth — exercise handler stack without session. */
    const res = await request.post(
      `${api}/user-configs/unsubscribe-marketing`,
      {
        data: "not-json",
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const ct = (res.headers()["content-type"] ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      const text = await res.text();
      expect(text.toLowerCase()).not.toContain("stack");
      expect(text).not.toMatch(/at \w+\s*\(/);
      return;
    }
    const body = await res.json();
    const serialized = JSON.stringify(body);
    expect(serialized.toLowerCase()).not.toContain("stack");
    expect(serialized).not.toMatch(/at \w+\s*\(/);
  });

  test("SPA roots do not look like Apache directory listings", async ({
    request,
  }) => {
    const res = await request.get(app);
    const html = await res.text();
    expect(html).not.toMatch(/Index of\s+\//i);
    expect(html.toLowerCase()).not.toContain("<title>directory listing");
  });
});
