import type { Page } from "@playwright/test";

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
}

type ElementString = string | ElementStringObject;

export const getByString = (page: Page, stringThing: ElementString) => {
  if (typeof stringThing === "string") {
    return page.getByText(stringThing, { exact: true });
  }
  if (stringThing["v-text"]) {
    return page.getByText(stringThing["v-text"], { exact: true });
  }
  if (stringThing["data-testid"]) {
    return page.getByTestId(stringThing["data-testid"]);
  }
  if (stringThing.placeholder) {
    return page.getByPlaceholder(stringThing.placeholder, { exact: true });
  }
  throw new Error(`Invalid string thing: ${JSON.stringify(stringThing)}`);
};
