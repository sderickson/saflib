import { expect, type Page, test } from "@playwright/test";
import {
  getByString as playwrightGetByString,
  tightAndroidViewport,
  cleanScreenshots as playwrightCleanScreenshots,
  attachScreenshot as playwrightAttachScreenshot,
  type ScreenshotOptions,
} from "@saflib/playwright";
import type { ElementString } from "@saflib/utils";

export class SafAppFixture {
  constructor(private page: Page) {}

  /**
   * Assert that a product event was fired.
   * @param event - The event name to check for
   */
  async assertEvent(event: string): Promise<void> {
    const events = await this.page
      .locator("pre[data-testid='events']")
      .textContent();
    const parsedEvents = events ? JSON.parse(events) : [];
    expect(parsedEvents.includes(event), `Event ${event} found`).toBe(true);
  }

  /**
   * Get all product events that have been fired.
   * @returns Array of event names
   */
  async getEvents(): Promise<string[]> {
    const events = await this.page
      .locator("pre[data-testid='events']")
      .textContent();
    return events ? JSON.parse(events) : [];
  }

  /**
   * Get an element by an ElementString. Use this as much as possible, as it really helps avoid spending a bunch of time debugging string matching issues.
   */
  getByString(stringThing: ElementString) {
    return playwrightGetByString(this.page, stringThing);
  }

  /**
   * Set the viewport size to tight Android dimensions for mobile testing.
   */
  async useTightAndroidViewport(): Promise<void> {
    await this.page.setViewportSize(tightAndroidViewport);
  }

  /**
   * Clean up screenshots from the previous test run. Call this at the beginning of your test.
   */
  async cleanScreenshots(): Promise<void> {
    await playwrightCleanScreenshots();
  }

  /**
   * Attach a screenshot to the test report. Use throughout tests to create a visual record of the user journey for easier review.
   */
  async attachScreenshot(options: ScreenshotOptions = {}): Promise<void> {
    await playwrightAttachScreenshot(this.page, options);
  }

  /**
   * Execute a test step with automatic screenshot on error.
   * Wraps test.step and automatically attaches a screenshot if the step fails,
   * then rethrows the error.
   * @param title - The step title
   * @param fn - The step function to execute
   * @returns The result of the step function
   */
  async step<T>(
    title: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return test.step(title, async () => {
      try {
        const result = await fn();
        // Attach screenshot on success too for visual record
        await this.attachScreenshot();
        return result;
      } catch (error) {
        // Attach screenshot on error before rethrowing
        await this.attachScreenshot();
        throw error;
      }
    });
  }
}

/**
 * Playwright fixture function for SafAppFixture that automatically sets up:
 * - Clean screenshots
 * - Tight Android viewport
 */
export const safAppFixture = async (
  { page }: { page: Page },
  use: (fixture: SafAppFixture) => Promise<void>,
) => {
  const fixture = new SafAppFixture(page);
  await fixture.cleanScreenshots();
  await fixture.useTightAndroidViewport();
  await use(fixture);
};
