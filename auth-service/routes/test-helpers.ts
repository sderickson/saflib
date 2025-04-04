import type { Response } from "supertest";

export function getCsrfToken(res: Response): string {
  const setCookies = res.headers["set-cookie"] as unknown as string[];
  const csrfCookie = setCookies.find((cookie) =>
    cookie.startsWith("_csrf_token="),
  );
  const csrfToken = csrfCookie?.split(";")[0].split("=")[1] || "";
  return csrfToken;
}
