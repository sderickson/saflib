import type { Page } from "@playwright/test";
import { getByString } from "@saflib/playwright";
import { admin_strings } from "../strings";

/**
 * Admin fixture for SAF applications.
 * Provides utilities for interacting with admin pages in tests.
 */
export class SafAdminFixture {
  constructor(private page: Page) {}

  /**
   * Navigate to the test utils page and click "Enter Test Mode".
   * @param testUtilsPath - Path to the test utils page. Defaults to "/".
   */
  async enterTestMode(testUtilsPath: string = "/"): Promise<void> {
    await this.page.goto(testUtilsPath);
    await getByString(
      this.page,
      admin_strings.test_utils_page.enterTestMode,
    ).click();
  }

  /**
   * Navigate to the last mock email page for a given subdomain.
   * @param mockEmailsPath - Path to the mock emails page (e.g., "/mock-emails/last")
   * @param subdomain - The subdomain to check emails for (e.g., "power-up", "identity")
   */
  async gotoLastMockEmail(
    mockEmailsPath: string,
    subdomain: string,
  ): Promise<void> {
    await this.page.goto(`${mockEmailsPath}?subdomain=${subdomain}`);
  }
}

