import { expect, test as base } from "@playwright/test";
import {
  loginPageFixture,
  registrationPageFixture,
  verifyWallPageFixture,
  type LoginPageFixture,
  type RegistrationPageFixture,
  type VerifyWallPageFixture,
} from "@saflib/ory-kratos-spa/fixtures";
import { apiOrigin, evilOrigin, getCsrfToken } from "./fixtures/http-helpers.ts";
import {
  expectCsrfFailure,
  sessionAsRegisteredUser,
} from "./fixtures/kratos-session.ts";

type CsrfFixtures = {
  loginPage: LoginPageFixture;
  registrationPage: RegistrationPageFixture;
  verifyWallPage: VerifyWallPageFixture;
};

const test = base.extend<CsrfFixtures>({
  loginPage: loginPageFixture,
  registrationPage: registrationPageFixture,
  verifyWallPage: verifyWallPageFixture,
});

/**
 * CSRF probes use PUT /user-configs/mine (authenticated, CSRF-protected).
 */
test.describe("CSRF (double-submit)", () => {
  test("PUT /user-configs/mine without CSRF header returns 403", async ({
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

    const res = await page.request.put(`${apiOrigin()}/user-configs/mine`, {
      data: {
        displayName: "csrf probe",
        marketingEmailsOptIn: false,
      },
      headers: { "Content-Type": "application/json" },
    });
    await expectCsrfFailure(res);
  });

  test("PUT /user-configs/mine with mismatched CSRF token returns 403", async ({
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
    await getCsrfToken(page, origin);
    const res = await page.request.put(`${origin}/user-configs/mine`, {
      data: {
        displayName: "bad token",
        marketingEmailsOptIn: false,
      },
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": "definitely-not-the-cookie-value",
      },
    });
    await expectCsrfFailure(res);
  });

  test("PUT /user-configs/mine with valid CSRF succeeds", async ({
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
    const res = await page.request.put(`${origin}/user-configs/mine`, {
      data: {
        displayName: `csrf ok ${Date.now()}`,
        marketingEmailsOptIn: false,
      },
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
    });
    expect(res.status(), await res.text()).toBe(200);
  });

  test("POST /user-configs/unsubscribe-marketing is no-auth and does not require CSRF token", async ({
    request,
  }) => {
    const res = await request.post(
      `${apiOrigin()}/user-configs/unsubscribe-marketing`,
      {
        data: { email: "csrf-public@example.com" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(res.status()).toBe(200);
  });

  test("POST /csp-violations is no-auth and does not require CSRF token", async ({
    request,
  }) => {
    const res = await request.post(`${apiOrigin()}/csp-violations`, {
      data: { "csp-report": { "document-uri": "http://csrf-probe/" } },
      headers: { "Content-Type": "application/csp-report" },
    });
    expect(res.status()).toBe(204);
  });

  test("cross-site page cannot read authenticated user-config response body", async ({
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

    await page.goto(`${evilOrigin()}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.status !== undefined ||
        document.documentElement.dataset.error !== undefined,
    );

    const status = await page.locator("html").getAttribute("data-status");
    const peek = await page.locator("html").getAttribute("data-peek");
    const err = await page.locator("html").getAttribute("data-error");

    const n = Number(status ?? "0");
    const leakedUserConfigJson =
      err === null &&
      n >= 200 &&
      n < 300 &&
      peek !== null &&
      peek.includes('"userConfig"');

    expect(
      leakedUserConfigJson,
      "Must not expose userConfig JSON to evil origin (fix CORS allowlist if this fails)",
    ).toBe(false);
  });
});
