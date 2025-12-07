/**
 * Utilities for Playwright tests.
 * @module @saflib/playwright
 */

import type { Page } from "@playwright/test";
export * from "./screenshots.ts";
import {
  convertI18NInterpolationToRegex,
  type ElementString,
} from "@saflib/utils";

/**
 * Dimensions for a small Android device, for E2E testing the mobile experience.
 */
export const tightAndroidViewport = { width: 430, height: 700 };

/**
 * Convenience function for generating a unique user ID for tests.
 */
export const getUniqueId = () => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Convenience function for generating a unique email for tests.
 */
export const getUniqueEmail = () => {
  return `test${getUniqueId()}@gmail.com`;
};

/**
 * Convenience function for getting an element by an ElementString. Use this as much as possible, as it really helps avoid spending a bunch of time debugging string matching issues.
 */
export const getByString = (page: Page, stringThing: ElementString) => {
  if (typeof stringThing === "string") {
    return page.getByText(convertI18NInterpolationToRegex(stringThing), {
      exact: true,
    });
  }
  if (stringThing["aria-label"]) {
    return page.getByLabel(stringThing["aria-label"], { exact: true });
  }
  if (stringThing.label) {
    return page.getByLabel(stringThing.label, { exact: true });
  }
  if (stringThing["data-testid"]) {
    return page.getByTestId(stringThing["data-testid"]);
  }
  if (stringThing.placeholder) {
    return page.getByPlaceholder(stringThing.placeholder, { exact: true });
  }
  if (stringThing["text"]) {
    return page.getByText(stringThing["text"], { exact: true });
  }
  throw new Error(`Invalid string thing: ${JSON.stringify(stringThing)}`);
};

/**
 * The Vuetify select component is a bit tricky with Playwright, so this is a convenience function for choosing an option.
 */
export const chooseVuetifySelectOption = async (
  page: Page,
  label: string,
  option: string,
) => {
  await page.getByRole("combobox").filter({ hasText: label }).click();
  await page.pause();
  try {
    await page.getByRole("option", { name: option, exact: true }).click();
  } catch (error) {
    const optionPromises = (await page.getByRole("option").all()).map(
      (option) => option.textContent(),
    );
    const options = await Promise.all(optionPromises);
    console.error(
      `Option not found: ${option}, all options: ${options.join(", ")}`,
    );
    throw new Error(
      `Option not found: ${option}, options: ${options.slice(0, 10).join(", ")}${options.length > 10 ? "..." : ""}`,
    );
  }
};
