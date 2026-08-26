import { expect, test as base } from "@playwright/test";
import {
  loginPageFixture,
  type LoginPageFixture,
} from "@saflib/ory-kratos-spa/pages/login/login.fixture.ts";
import {
  registrationPageFixture,
  type RegistrationPageFixture,
} from "@saflib/ory-kratos-spa/pages/registration/registration.fixture.ts";
import {
  verifyWallPageFixture,
  type VerifyWallPageFixture,
} from "@saflib/ory-kratos-spa/pages/verify-wall/verify-wall.fixture.ts";
import { apiOrigin, getCsrfToken } from "./fixtures/http-helpers.ts";
import { sessionAsRegisteredUser } from "./fixtures/kratos-session.ts";

type AuthzFixtures = {
  loginPage: LoginPageFixture;
  registrationPage: RegistrationPageFixture;
  verifyWallPage: VerifyWallPageFixture;
};

const test = base.extend<AuthzFixtures>({
  loginPage: loginPageFixture,
  registrationPage: registrationPageFixture,
  verifyWallPage: verifyWallPageFixture,
});

test.describe("authorization (base API)", () => {
  test("GET /user-configs/mine without session returns 401", async ({
    request,
  }) => {
    const res = await request.get(`${apiOrigin()}/user-configs/mine`);
    expect(res.status()).toBe(401);
  });

  test("GET /audit-logs without session returns 401", async ({ request }) => {
    const res = await request.get(`${apiOrigin()}/audit-logs?limit=1`);
    expect(res.status()).toBe(401);
  });

  test("verified non-admin cannot POST /admin/test-error", async ({
    page,
    loginPage,
    registrationPage,
    verifyWallPage,
  }) => {
    await sessionAsRegisteredUser(
      page,
      registrationPage,
      verifyWallPage,
      loginPage,
    );

    const origin = apiOrigin();
    const csrf = await getCsrfToken(page, origin);
    const res = await page.request.post(`${origin}/admin/test-error`, {
      data: {},
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("Forbidden");
  });

  test("non-admin cannot GET /admin/errors", async ({
    page,
    loginPage,
    registrationPage,
    verifyWallPage,
  }) => {
    await sessionAsRegisteredUser(
      page,
      registrationPage,
      verifyWallPage,
      loginPage,
    );

    const res = await page.request.get(`${apiOrigin()}/admin/errors`);
    expect(res.status()).toBe(403);
  });

  test("non-admin cannot GET /audit-logs", async ({
    page,
    loginPage,
    registrationPage,
    verifyWallPage,
  }) => {
    await sessionAsRegisteredUser(
      page,
      registrationPage,
      verifyWallPage,
      loginPage,
    );

    const res = await page.request.get(`${apiOrigin()}/audit-logs?limit=1`);
    expect(res.status()).toBe(403);
  });
});
