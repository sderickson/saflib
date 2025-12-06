import { expect, type Page } from "@playwright/test";

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
}
