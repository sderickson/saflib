import { describe, expect, it } from "vitest";
import type { UiNode } from "@ory/client";
import {
  focusableInputNames,
  focusFirstFocusableInForm,
  focusKratosFlowFormField,
} from "./useKratosFlowFocusAfterUiChange.ts";

function inputNode(
  name: string,
  type = "text",
  group = "default",
): UiNode {
  return {
    type: "input",
    group,
    attributes: { node_type: "input", name, type, disabled: false },
    messages: [],
    meta: {},
  } as unknown as UiNode;
}

describe("focusableInputNames", () => {
  it("skips hidden, submit, and csrf fields", () => {
    const names = focusableInputNames({
      ui: {
        nodes: [
          inputNode("csrf_token", "hidden"),
          inputNode("identifier"),
          inputNode("password", "password"),
          inputNode("method", "submit"),
        ],
      },
    });
    expect(names).toEqual(["identifier", "password"]);
  });
});

describe("focusKratosFlowFormField", () => {
  function mountForm(form: HTMLFormElement) {
    document.body.append(form);
    return () => form.remove();
  }

  it("focuses the first visible field in DOM order", () => {
    const form = document.createElement("form");
    const cleanup = mountForm(form);
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "csrf_token";
    const first = document.createElement("input");
    first.name = "identifier";
    const second = document.createElement("input");
    second.name = "password";
    form.append(hidden, first, second);

    expect(focusFirstFocusableInForm(form)).toBe(true);
    expect(document.activeElement).toBe(first);
    cleanup();
  });

  it("focuses a named field nested inside a wrapper", () => {
    const form = document.createElement("form");
    const cleanup = mountForm(form);
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    input.name = "totp_code";
    wrapper.append(input);
    form.append(wrapper);

    expect(focusKratosFlowFormField(form, "totp_code")).toBe(true);
    expect(document.activeElement).toBe(input);
    cleanup();
  });

  it("focuses the visible phone input when the named control is hidden", () => {
    const form = document.createElement("form");
    const cleanup = mountForm(form);
    const wrapper = document.createElement("div");
    wrapper.className = "v-input";
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "traits.phone";
    const visible = document.createElement("input");
    visible.type = "tel";
    wrapper.append(hidden, visible);
    form.append(wrapper);

    expect(focusKratosFlowFormField(form, "traits.phone")).toBe(true);
    expect(document.activeElement).toBe(visible);
    cleanup();
  });
});
