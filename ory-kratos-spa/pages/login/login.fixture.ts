import { expect, type Page } from "@playwright/test";
import { login_intro as introStrings } from "./LoginIntro.strings.ts";

/**
 * Page helpers for {@link ./Login.vue} (Kratos login flow UI).
 */
export class LoginPageFixture {
  constructor(public readonly page: Page) {}

  /**
   * Opens the auth host login flow (browser flow creation). Optional {@link returnTo} sets `?return_to=`.
   *
   * Tolerates an in-flight redirect to the same login URL (e.g. app auth gate
   * bouncing after logout), which otherwise aborts `page.goto`.
   */
  async gotoLogin(options?: { returnTo?: string }): Promise<void> {
    const protocol = process.env.PROTOCOL ?? "http";
    const domain = process.env.DOMAIN ?? "daemon.docker.localhost";
    let url = `${protocol}://auth.${domain}/new-login`;
    if (options?.returnTo) {
      url += `?return_to=${encodeURIComponent(options.returnTo)}`;
    }
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const interrupted =
        message.includes("interrupted by another navigation") ||
        message.includes("NS_BINDING_ABORTED");
      if (!interrupted) {
        throw error;
      }
      await this.page.waitForURL(
        (u) =>
          u.hostname === `auth.${domain}` &&
          (u.pathname === "/new-login" ||
            u.pathname === "/login" ||
            u.pathname.startsWith("/login")),
        { timeout: 5_000 },
      );
    }
  }

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
