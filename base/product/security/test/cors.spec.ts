import { expect, test } from "@playwright/test";
import {
  apiOrigin,
  appOrigin,
  evilOrigin,
} from "@saflib/security/origins/urls";
import {
  assertCorsAllowsOrigin,
  assertCorsDoesNotAllowOrigin,
} from "@saflib/security/http/cors";

/**
 * Caddy must not reflect arbitrary Origins on the API (explicit DOMAIN allowlist).
 */
const api = apiOrigin();
const evil = evilOrigin();
const app = appOrigin();

test.describe("CORS (API host)", () => {
  test("preflight from evil origin must not allow cross-origin API access", async ({
    request,
  }) => {
    const res = await request.fetch(`${api}/health`, {
      method: "OPTIONS",
      headers: {
        Origin: evil,
        "Access-Control-Request-Method": "GET",
      },
    });
    assertCorsDoesNotAllowOrigin(res.headers(), evil);
  });

  test("preflight from app origin is allowed for API reads", async ({
    request,
  }) => {
    const res = await request.fetch(`${api}/health`, {
      method: "OPTIONS",
      headers: {
        Origin: app,
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(
      res.status(),
      "OPTIONS preflight from app → API should succeed",
    ).toBe(204);
    assertCorsAllowsOrigin(res.headers(), app);
  });

  test("simple GET from evil origin must not echo ACAO for credentialed browser fetches", async ({
    request,
  }) => {
    const res = await request.get(`${api}/health`, {
      headers: { Origin: evil },
    });
    assertCorsDoesNotAllowOrigin(res.headers(), evil);
  });
});
