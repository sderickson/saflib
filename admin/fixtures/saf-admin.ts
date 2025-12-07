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

  /**
   * Get the subject of the last mock email displayed on the page.
   * @returns The email subject text
   */
  async getEmailSubject(): Promise<string> {
    const subjectElement = this.page.locator("v-card-title h3").first();
    return await subjectElement.textContent() ?? "";
  }

  /**
   * Get the text body of the last mock email displayed on the page.
   * @returns The email text body, or empty string if no text body exists
   */
  async getEmailText(): Promise<string> {
    const textElement = this.page.locator("pre.text-wrap").first();
    const count = await textElement.count();
    if (count === 0) {
      return "";
    }
    return await textElement.textContent() ?? "";
  }

  /**
   * Get the HTML body of the last mock email displayed on the page.
   * @returns The email HTML body, or empty string if no HTML body exists
   */
  async getEmailHtml(): Promise<string> {
    // The HTML is rendered in a div that's a direct child of a div.mb-2
    // Find the div.mb-2 that doesn't contain a pre element (that's the HTML section)
    // Then get the last div child (the HTML content div, after the strong label if present)
    const cardText = this.page.locator("v-card-text").first();
    const htmlContainer = cardText
      .locator("div.mb-2")
      .filter({
        hasNot: this.page.locator("pre"),
      })
      .first();
    
    const containerCount = await htmlContainer.count();
    if (containerCount === 0) {
      return "";
    }
    
    // Get the last div child (the HTML content, not the strong label)
    const htmlDiv = htmlContainer.locator("> div").last();
    const divCount = await htmlDiv.count();
    if (divCount === 0) {
      return "";
    }
    
    return await htmlDiv.innerHTML();
  }
}

