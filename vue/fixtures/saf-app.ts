import { test as base, expect, type Page } from "@playwright/test";

export type SafAppFixture = {
  safApp: {
    /**
     * Assert that a product event was fired.
     * @param event - The event name to check for
     */
    assertEvent: (event: string) => Promise<void>;
    /**
     * Get all product events that have been fired.
     * @returns Array of event names
     */
    getEvents: () => Promise<string[]>;
  };
};

export const safAppFixture = base.extend<SafAppFixture>({
  safApp: async ({ page }, use) => {
    const safApp = {
      async assertEvent(event: string) {
        const events = await page
          .locator("pre[data-testid='events']")
          .textContent();
        const parsedEvents = events ? JSON.parse(events) : [];
        expect(
          parsedEvents.includes(event),
          `Event ${event} found`,
        ).toBe(true);
      },

      async getEvents(): Promise<string[]> {
        const events = await page
          .locator("pre[data-testid='events']")
          .textContent();
        return events ? JSON.parse(events) : [];
      },
    };

    await use(safApp);
  },
});
