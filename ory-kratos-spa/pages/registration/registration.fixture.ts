import { expect, type Page } from "@playwright/test";
import { linkToHref, type Link } from "@saflib/links";
import { registration_intro as introStrings } from "./RegistrationIntro.strings.ts";

/**
 * Page helpers for {@link ./Registration.vue} (Kratos registration flow UI).
 */
export class RegistrationPageFixture {
  constructor(public readonly page: Page) {}

  /**
   * Opens the auth host registration entry route (two-step Kratos flow).
   * Uses {@link process.env.PROTOCOL} and {@link process.env.DOMAIN} (e.g. Playwright client config).
   */
  async gotoRegistration(): Promise<void> {
    const protocol = process.env.PROTOCOL ?? "http";
    const domain = process.env.DOMAIN ?? "daemon.docker.localhost";
    await this.page.goto(`${protocol}://auth.${domain}/new-registration`);
  }

  /**
   * Asserts the registration view is visible (intro + flow shell), like `expect(locator).toBeVisible()`.
   */
  async toBeVisible(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: introStrings.title }),
    ).toBeVisible();
  }

  private get emailInput() {
    return this.page.getByRole("textbox", { name: "E-Mail" });
  }

  private get firstNameInput() {
    return this.page.getByLabel("First name");
  }

  private get lastNameInput() {
    return this.page.getByLabel("Last name");
  }

  private get passwordInput() {
    return this.page.getByRole("textbox", { name: "Password" });
  }

  private get signUpButton() {
    return this.page.getByRole("button", { name: "Sign up" });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.click();
    await this.emailInput.fill(email);
  }

  async submitEmailStep(): Promise<void> {
    await this.signUpButton.click();
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
  }

  async fillFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.click();
    await this.firstNameInput.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.lastNameInput.click();
    await this.lastNameInput.fill(lastName);
  }

  async submitPasswordStep(): Promise<void> {
    await this.signUpButton.click();
  }

  /**
   * Full registration: email step, then password step (two-step Kratos flow).
   * Fills first/last name only when those traits exist in the flow (schema-dependent).
   */
  async completeRegistration(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.submitEmailStep();
    if ((await this.firstNameInput.count()) > 0) {
      await this.fillFirstName("Test");
    }
    if ((await this.lastNameInput.count()) > 0) {
      await this.fillLastName("User");
    }
    await this.fillPassword(password);
    await this.submitPasswordStep();
  }

  /**
   * Opens the admin last-mock-email page (`adminLinks.lastMockEmail` in `@pathclerk/daemon-links`),
   * then follows the Kratos verification link from the newest matching mock-sent email.
   *
   * @param params.subdomain — SDK service subdomain for `GET /email/sent` (defaults to `"api"`).
   */
  async completeEmailVerification(
    adminLastEmailLink: Link,
    params: { subdomain?: string; userEmail: string },
  ): Promise<void> {
    const domain = process.env.DOMAIN ?? "daemon.docker.localhost";
    const subdomain = params.subdomain ?? "api";
    const url = linkToHref(adminLastEmailLink, {
      domain,
      params: {
        subdomain,
        userEmail: params.userEmail,
      },
    });
    await this.page.goto(url);
    const kratosLink = this.page.locator(
      'a[href*="verification"], a[href*="self-service"]',
    ).first();
    await expect(kratosLink).toBeVisible({ timeout: 60_000 });
    await kratosLink.click();
  }
}

export const registrationPageFixture = async (
  { page }: { page: Page },
  use: (fixture: RegistrationPageFixture) => Promise<void>,
) => {
  await use(new RegistrationPageFixture(page));
};
