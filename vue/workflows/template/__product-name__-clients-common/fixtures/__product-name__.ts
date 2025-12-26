import type { Page } from "@playwright/test";
import { SafAppFixture } from "@saflib/vue/fixtures";

/**
 * Unified __ProductName__ fixture that extends SafAppFixture.
 * This is the main fixture to use in __ProductName__ E2E tests.
 */
export class __ProductName__Fixture extends SafAppFixture {
  constructor(page: Page) {
    super(page);
  }
}

/**
 * Playwright fixture function for __ProductName__Fixture that automatically sets up:
 * - Clean screenshots (via SafAppFixture)
 * - Tight Android viewport (via SafAppFixture)
 */
export const __productName__Fixture = async (
  { page }: { page: Page },
  use: (fixture: __ProductName__Fixture) => Promise<void>,
) => {
  const fixture = new __ProductName__Fixture(page);
  await fixture.cleanScreenshots();
  await fixture.useTightAndroidViewport();
  await use(fixture);
};

