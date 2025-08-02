import type { Response } from "supertest";
import { expect } from "vitest";

export function getCsrfToken(res: Response): string {
  const setCookies = res.headers["set-cookie"] as unknown as string[];
  const csrfCookie = setCookies.find((cookie) =>
    cookie.startsWith("_csrf_token="),
  );
  const csrfToken = csrfCookie?.split(";")[0].split("=")[1] || "";
  return csrfToken;
}

export async function testRateLimiting(makeRequest: () => Promise<Response>) {
  let rateLimited = false;
  for (let i = 0; i < 100; i++) {
    const res = await makeRequest();
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  expect(rateLimited).toBe(true);
}
