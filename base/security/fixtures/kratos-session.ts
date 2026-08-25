import { expect, type Page } from "@playwright/test";
import type {
  LoginPageFixture,
  RegistrationPageFixture,
  VerifyWallPageFixture,
} from "@saflib/ory-kratos-spa/fixtures";
import { getUniqueEmail } from "@saflib/playwright";
import { apiOrigin } from "./http-helpers.ts";

/** Default password for security-suite registrations. */
export const TEST_PASSWORD = "packtofu-security";

/**
 * Register a unique user and wait until a Kratos session cookie is usable on the API host.
 * Email verification is not required for base `user-configs` / CSRF probes.
 */
export async function registerWithoutVerifying(
  page: Page,
  registrationPage: RegistrationPageFixture,
  _verifyWallPage: VerifyWallPageFixture,
  email?: string,
): Promise<string> {
  const unique = email ?? getUniqueEmail();
  await page.context().clearCookies();
  await registrationPage.gotoRegistration();
  await registrationPage.toBeVisible();
  await registrationPage.completeRegistration(unique, TEST_PASSWORD);

  // Registration may land on verify-wall, app, or a 404 after default return_to;
  // the session cookie on `.docker.localhost` is what API probes need.
  await expect
    .poll(
      async () => {
        const cookies = await page.context().cookies(apiOrigin());
        return cookies.some(
          (c) =>
            /session/i.test(c.name) &&
            !/csrf|xsrf|continuity/i.test(c.name),
        );
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  return unique;
}

/**
 * Register a unique non-admin user with an active browser session.
 */
export async function sessionAsRegisteredUser(
  page: Page,
  registrationPage: RegistrationPageFixture,
  verifyWallPage: VerifyWallPageFixture,
  _loginPage: LoginPageFixture,
): Promise<string> {
  return registerWithoutVerifying(page, registrationPage, verifyWallPage);
}

/** Assert Playwright got a CSRF-failure JSON body. */
export async function expectCsrfFailure(res: {
  status: () => number;
  json: () => Promise<{ message?: string }>;
}): Promise<void> {
  expect(res.status()).toBe(403);
  const body = await res.json();
  expect(body.message).toContain("CSRF");
}
