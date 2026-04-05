import { expect, type Page } from "@playwright/test";
import { verify_wall_actions as actionStrings } from "./VerifyWallActions.strings.ts";
import { verify_wall_intro as introStrings } from "./VerifyWallIntro.strings.ts";

/**
 * Page helpers for {@link ./VerifyWall.vue} (unverified / verified session wall).
 */
export class VerifyWallPageFixture {
  constructor(public readonly page: Page) {}

  async expectConfirmEmailHeadingVisible(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: introStrings.title }),
    ).toBeVisible();
  }

  async clickContinueToApp(): Promise<void> {
    await this.page
      .getByRole("link", { name: actionStrings.cta_continue })
      .click();
  }
}

export const verifyWallPageFixture = async (
  { page }: { page: Page },
  use: (fixture: VerifyWallPageFixture) => Promise<void>,
) => {
  await use(new VerifyWallPageFixture(page));
};
