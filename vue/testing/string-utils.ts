import { expect } from "vitest";
import { DOMWrapper, type VueWrapper } from "@vue/test-utils";
import {
  convertI18NInterpolationToRegex,
  type ElementString,
} from "@saflib/utils";

type ElementWrapper = VueWrapper | DOMWrapper<Element>;

function findInputForLabel(
  wrapper: ElementWrapper,
  labelText: string,
): ElementWrapper | undefined {
  const inputs = wrapper.findAll("input, textarea, select");
  const inputByAria = inputs.find(
    (el) => el.attributes("aria-label")?.trim() === labelText,
  );
  if (inputByAria?.exists()) {
    return inputByAria;
  }

  const labelLike = [
    ...wrapper.findAll("label"),
    ...wrapper.findAll(".v-label"),
    ...wrapper.findAll(".v-field-label"),
  ];
  const labelEl = labelLike.find((el) => el.text().trim() === labelText);
  if (!labelEl?.exists()) {
    return undefined;
  }

  const forId = labelEl.attributes("for");
  if (forId) {
    const linked = wrapper.find(`#${CSS.escape(forId)}`);
    if (linked.exists()) {
      return linked;
    }
  }

  const fieldInput = labelEl.element
    .closest(".v-field")
    ?.querySelector("input, textarea, select");
  if (fieldInput) {
    return new DOMWrapper(fieldInput);
  }

  return labelEl;
}

/**
 * This should always be used to find elements in tests.
 */
export const getElementByString = (
  wrapper: ElementWrapper,
  stringObj: ElementString,
) => {
  if (typeof stringObj === "string" || stringObj["text"]) {
    const elements = wrapper.findAll("*");
    const text: string =
      typeof stringObj === "string" ? stringObj : stringObj["text"]!;

    if (text.includes("{")) {
      // handle i18n interpolation with regex
      const r = convertI18NInterpolationToRegex(text);
      const element = elements.find((el) => {
        return el.text().match(r);
      });
      if (element) {
        return element;
      }
      throw new Error(`Element not found: ${text}`);
    }

    const element = elements.find((el) => {
      return el.text() === text;
    });
    expect(element?.exists()).toBe(true);
    return element!;
  }

  if (stringObj.label) {
    const element = findInputForLabel(wrapper, stringObj.label);
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
