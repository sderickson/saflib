import type { Page } from "@playwright/test";

/**
 * Page helpers for {@link ./Registration.vue} (Kratos registration flow UI).
 */
export class RegistrationPageFixture {
  constructor(public readonly page: Page) {}

  private get emailInput() {
    return this.page.getByRole("textbox", { name: "E-Mail" });
  }

  private get passwordInput() {
    return this.page.locator("#kratos-login-2");
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

  async submitPasswordStep(): Promise<void> {
    await this.signUpButton.click();
  }

  /**
   * Full registration: email step, then password step (two-step Kratos flow).
   */
  async completeRegistration(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.submitEmailStep();
    await this.fillPassword(password);
    await this.submitPasswordStep();
  }
}

export const registrationPageFixture = async (
  { page }: { page: Page },
  use: (fixture: RegistrationPageFixture) => Promise<void>,
) => {
  await use(new RegistrationPageFixture(page));
};
