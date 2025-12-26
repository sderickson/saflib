import type { Page } from "@playwright/test";
import { getByString } from "@saflib/playwright";
import { admin_strings } from "../strings";

interface SafAdminFixtureConfig {
  domain: string;
  admin?: string;
}

/**
 * Admin fixture for SAF applications.
 * Provides utilities for interacting with admin pages in tests.
 */
export class SafAdminFixture {
  private readonly adminSubdomain: string;

  constructor(
    private page: Page,
    private config: SafAdminFixtureConfig,
  ) {
    this.adminSubdomain = config.admin ?? "admin";
  }

  private getAdminUrl(path: string): string {
    return `http://${this.adminSubdomain}.${this.config.domain}${path}`;
  }

  /**
   * Navigate to the admin test utils page and click "Enter Test Mode".
   */
  async enterTestMode(): Promise<void> {
    await this.page.goto(this.getAdminUrl("/test-utils"));
    await getByString(
      this.page,
      admin_strings.test_utils_page.enterTestMode,
    ).click();
  }

  /**
   * Navigate to the admin home page.
   */
  async gotoHome(): Promise<void> {
    await this.page.goto(this.getAdminUrl("/"));
  }

  /**
   * Navigate to the last mock email page for a given subdomain.
   * @param subdomain - The subdomain to check emails for (e.g., "power-up", "identity").
   *                    If not provided, extracts the subdomain from the domain
   *                    (e.g., "power-up" from "power-up.docker.localhost").
   */
  async gotoLastMockEmail(subdomain?: string): Promise<void> {
    const emailSubdomain =
      subdomain ?? this.config.domain.split(".")[0] ?? "power-up";
    await this.page.goto(
      `${this.getAdminUrl("/mock-emails/last")}?subdomain=${emailSubdomain}`,
    );
  }

  /**
   * Get the subject of the last mock email displayed on the page.
   * @returns The email subject text
   */
  async getEmailSubject(): Promise<string> {
    const subjectElement = this.page.locator("v-card-title h3").first();
    return (await subjectElement.textContent()) ?? "";
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
    return (await textElement.textContent()) ?? "";
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
