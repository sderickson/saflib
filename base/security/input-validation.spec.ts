import { expect, test } from "@playwright/test";
import { apiOrigin } from "@saflib/security/origins/urls";

const api = apiOrigin();

test.describe("input validation (public unsubscribe)", () => {
  test("HTML-like content in JSON body returns 400", async ({ request }) => {
    const res = await request.post(
      `${api}/user-configs/unsubscribe-marketing`,
      {
        data: {
          email: "pat@example.com<script>alert(1)</script>",
        },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(res.status()).toBe(400);
  });

  test("oversized JSON body hits express limit (413)", async ({ request }) => {
    const hugeEmail = `${"z".repeat(3 * 1024 * 1024)}@example.com`;
    const res = await request.post(
      `${api}/user-configs/unsubscribe-marketing`,
      {
        data: { email: hugeEmail },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(res.status()).toBe(413);
  });

  test("missing required OpenAPI fields returns 400", async ({ request }) => {
    const res = await request.post(
      `${api}/user-configs/unsubscribe-marketing`,
      {
        data: {},
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(res.status()).toBe(400);
  });
});
