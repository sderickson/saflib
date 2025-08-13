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
  role?: "button" | "combobox" | "option" | "heading" | "link";
  text?: string;
  "data-testid"?: string;
  placeholder?: string;
  "aria-label"?: string;
  label?: string;
}

const convertI18NInterpolationToRegex = (str: string) => {
  if (str.includes("{")) {
    return new RegExp(str.replace(/\{(.*?)\}/g, ".*"));
  }
  return str;
};

type ElementString = string | ElementStringObject;

export const getByString = (page: Page, stringThing: ElementString) => {
  if (typeof stringThing === "string") {
    if (stringThing.includes("{")) {
      console.log(
        "converting",
        stringThing,
        "to",
        convertI18NInterpolationToRegex(stringThing),
      );
    }
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

export const chooseVuetifySelectOption = async (
  page: Page,
  label: string,
  option: string,
) => {
  await page.getByRole("combobox").filter({ hasText: label }).click();
  await page.getByRole("option", { name: option }).click();
};
