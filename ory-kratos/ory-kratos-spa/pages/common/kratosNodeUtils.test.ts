import { describe, it, expect } from "vitest";
import type { UiNode } from "@ory/client";
import {
  isKratosInputNode,
  isKratosTraitsPhoneInputNode,
  kratosEffectiveInputType,
} from "./kratosNodeUtils.ts";

describe("isKratosInputNode", () => {
  it("narrows input nodes", () => {
    const node = {
      type: "input",
      attributes: { node_type: "input", name: "x", type: "text" },
    } as UiNode;
    expect(isKratosInputNode(node)).toBe(true);
  });

  it("rejects non-input nodes", () => {
    const node = {
      type: "text",
      attributes: { text: { text: "hi" } },
    } as UiNode;
    expect(isKratosInputNode(node)).toBe(false);
  });
});

describe("isKratosTraitsPhoneInputNode", () => {
  it("is true for traits.phone input nodes", () => {
    const node = {
      type: "input",
      attributes: {
        node_type: "input",
        name: "traits.phone",
        type: "tel",
      },
    } as UiNode;
    expect(isKratosTraitsPhoneInputNode(node)).toBe(true);
  });

  it("is false for other fields", () => {
    const node = {
      type: "input",
      attributes: { node_type: "input", name: "traits.email", type: "email" },
    } as UiNode;
    expect(isKratosTraitsPhoneInputNode(node)).toBe(false);
  });
});

describe("kratosEffectiveInputType", () => {
  it("masks password fields when Kratos sends type text", () => {
    expect(kratosEffectiveInputType({ name: "password", type: "text" })).toBe("password");
    expect(kratosEffectiveInputType({ name: "traits.password", type: "text" })).toBe("password");
  });

  it("preserves submit and hidden", () => {
    expect(kratosEffectiveInputType({ name: "x", type: "submit" })).toBe("submit");
    expect(kratosEffectiveInputType({ name: "csrf_token", type: "hidden" })).toBe("hidden");
  });
});
