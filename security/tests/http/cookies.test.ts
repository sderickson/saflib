import { describe, expect, test } from "vitest";
import { findCsrfCookie, findSessionCookie } from "../../http/cookies.ts";

describe("cookies", () => {
  test("findSessionCookie excludes csrf and continuity cookies", () => {
    const cookies = [
      { name: "ory_kratos_session", value: "abc" },
      { name: "csrf_token", value: "x" },
      { name: "continuity", value: "y" },
      { name: "_csrf_token", value: "z" },
    ] as Parameters<typeof findSessionCookie>[0];

    expect(findSessionCookie(cookies)?.name).toBe("ory_kratos_session");
    expect(findCsrfCookie(cookies)?.name).toBe("_csrf_token");
  });
});
