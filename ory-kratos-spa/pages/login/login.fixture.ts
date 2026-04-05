import { expect, type Page } from "@playwright/test";
import { login_intro as introStrings } from "./LoginIntro.strings.ts";

/**
 * Page helpers for {@link ./Login.vue} (Kratos login flow UI).
 */
export class LoginPageFixture {
  constructor(public readonly page: Page) {}

  /**
   * Asserts the first-step login view is visible, like `expect(locator).toBeVisible()`.
   */
  async toBeVisible(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: introStrings.title }),
    ).toBeVisible();
  }

  private get identifierInput() {
    return this.page.getByRole("textbox", { name: "E-Mail" });
  }

  private get passwordInput() {
    return this.page.getByRole("textbox", { name: "Password" });
  }

  private get signInWithPasswordButton() {
    return this.page.getByRole("button", { name: "Sign in with password" });
  }

  async fillIdentifier(email: string): Promise<void> {
    await this.identifierInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submitPasswordSignIn(): Promise<void> {
    await this.signInWithPasswordButton.click();
  }

  /**
   * Identifier + password + submit (default Ory login flow).
   */
  async signInWithPassword(email: string, password: string): Promise<void> {
    await this.fillIdentifier(email);
    await this.fillPassword(password);
    await this.submitPasswordSignIn();
  }
}

export const loginPageFixture = async (
  { page }: { page: Page },
  use: (fixture: LoginPageFixture) => Promise<void>,
) => {
  await use(new LoginPageFixture(page));
};
