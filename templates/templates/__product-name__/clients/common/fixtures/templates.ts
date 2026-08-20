import type { Page } from "@playwright/test";
import { SafAppFixture } from "@saflib/vue/fixtures";

/**
 * Unified Templates fixture that extends SafAppFixture.
 * This is the main fixture to use in Templates E2E tests.
 */
export class TemplatesFixture extends SafAppFixture {
  constructor(page: Page) {
    super(page);
  }
}

/**
 * Playwright fixture function for TemplatesFixture that automatically sets up:
 * - Clean screenshots (via SafAppFixture)
 * - Tight Android viewport (via SafAppFixture)
 */
export const templatesFixture = async (
  { page }: { page: Page },
  use: (fixture: TemplatesFixture) => Promise<void>,
) => {
  const fixture = new TemplatesFixture(page);
  await fixture.cleanScreenshots();
  await fixture.useTightAndroidViewport();
  await use(fixture);
};

