import type { Page } from "@playwright/test";
import { SafAppFixture } from "@saflib/vue/fixtures";

/**
 * Unified Base fixture that extends SafAppFixture.
 * This is the main fixture to use in Base E2E tests.
 */
export class BaseFixture extends SafAppFixture {
  constructor(page: Page) {
    super(page);
  }
}

/**
 * Playwright fixture function for BaseFixture that automatically sets up:
 * - Clean screenshots (via SafAppFixture)
 * - Tight Android viewport (via SafAppFixture)
 */
export const baseFixture = async (
  { page }: { page: Page },
  use: (fixture: BaseFixture) => Promise<void>,
) => {
  const fixture = new BaseFixture(page);
  await fixture.cleanScreenshots();
  await fixture.useTightAndroidViewport();
  await use(fixture);
};

