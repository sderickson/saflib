import { expect } from "vitest";
import { type VueWrapper } from "@vue/test-utils";

interface ElementStringObject {
  placeholder?: string;
  "v-text"?: string;
  "data-testid"?: string;
}

// Store strings for Vue components in Record<string, ElementString>
// Then you can v-bind them to the component, and also use them in tests for reliable element selection
// These objects can also be used in playwright tests, and eventually for i18n.
type ElementString = string | ElementStringObject;

export const getElementByString = (
  wrapper: VueWrapper,
  stringObj: ElementString,
) => {
  if (typeof stringObj === "string" || stringObj["v-text"]) {
    const elements = wrapper.findAllComponents("*");
    const text: string =
      typeof stringObj === "string" ? stringObj : stringObj["v-text"]!;
    const element = elements.find((el) => {
      return el.text() === text;
    });
    expect(element?.exists()).toBe(true);
    return element!;
  }

  if (stringObj.placeholder) {
    const elements = wrapper.findAll(
      `[placeholder="${stringObj.placeholder}"]`,
    );
    expect(elements.length).toBe(1);
    return elements[0];
  }

  if (stringObj["data-testid"]) {
    const elements = wrapper.findAll(
      `[data-testid="${stringObj["data-testid"]}"]`,
    );
    expect(elements.length).toBe(1);
    return elements[0];
  }

  throw new Error(`Unsupported string object: ${JSON.stringify(stringObj)}`);
};
