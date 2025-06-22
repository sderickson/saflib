import type { Page } from "@playwright/test";
export * from "./screenshots.ts";

export const tightAndroidViewport = { width: 430, height: 700 };

export const getUniqueId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const getUniqueEmail = () => {
  return `test${getUniqueId()}@gmail.com`;
};

interface ElementStringObject {
  "v-text"?: string;
  "data-testid"?: string;
  placeholder?: string;
  "aria-label"?: string;
}

type ElementString = string | ElementStringObject;

export const getByString = (page: Page, stringThing: ElementString) => {
  if (typeof stringThing === "string") {
    return page.getByText(stringThing, { exact: true });
  }
  if (stringThing["aria-label"]) {
    return page.getByLabel(stringThing["aria-label"]);
  }
  if (stringThing["data-testid"]) {
    return page.getByTestId(stringThing["data-testid"]);
  }
  if (stringThing.placeholder) {
    return page.getByPlaceholder(stringThing.placeholder, { exact: true });
  }
  if (stringThing["v-text"]) {
    return page.getByText(stringThing["v-text"], { exact: true });
  }
  throw new Error(`Invalid string thing: ${JSON.stringify(stringThing)}`);
};

// note: only for sure works with "outlined" variant right now.
// TODO: make it work generally.
export const chooseVuetifySelectOption = async (
  page: Page,
  label: string,
  option: string,
) => {
  await page.getByText(new RegExp(`^${label}.+${label}$`)).click();
  await page.getByText(option).click();
};
