import { expect, type Page } from "@playwright/test";
import {
  verification_intro,
  verification_verified,
} from "./VerificationIntro.strings.ts";

/**
 * Page helpers for {@link ./Verification.vue} (Kratos email verification flow).
 */
export class VerificationPageFixture {
  constructor(public readonly page: Page) {}

  /**
   * Asserts the verification intro heading is visible ({@link verification_intro.title}).
   */
  async toBeVisible(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: verification_intro.title }),
    ).toBeVisible();
  }

  /**
   * Submits the verification step using the flow submit button labeled {@link verification_verified.cta_continue}.
   */
  async clickContinue(): Promise<void> {
    await this.page
      .getByRole("button", { name: verification_verified.cta_continue })
      .click();
  }

  /**
   * Waits until the browser lands on the app host after post-verification redirect.
   */
  async expectRedirectToAppSubdomain(): Promise<void> {
    const domain = process.env.DOMAIN ?? "daemon.docker.localhost";
    const escaped = domain.replace(/\./g, "\\.");
    await expect(this.page).toHaveURL(
      new RegExp(`^https?://app\\.${escaped}(/|\\?|#|$)`),
      { timeout: 60_000 },
    );
  }
}

export const verificationPageFixture = async (
  { page }: { page: Page },
  use: (fixture: VerificationPageFixture) => Promise<void>,
) => {
  await use(new VerificationPageFixture(page));
};
