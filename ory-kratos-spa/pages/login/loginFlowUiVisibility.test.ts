import type { UiNode } from "@ory/client";
import { describe, expect, it } from "vitest";
import { loginFlowHasVisibleInteractiveNodes } from "./loginFlowUiVisibility.ts";

function inputNode(
  overrides: Partial<{
    group: string;
    type: string;
    name: string;
  }>,
): UiNode {
  const { group = "default", type = "text", name = "identifier" } = overrides;
  return {
    type: "input",
    group,
    attributes: {
      node_type: "input",
      name,
      type,
    },
  } as UiNode;
}

describe("loginFlowHasVisibleInteractiveNodes", () => {
  it("returns false when only hidden inputs exist", () => {
    expect(
      loginFlowHasVisibleInteractiveNodes([
        inputNode({ type: "hidden", name: "csrf_token" }),
        inputNode({ type: "hidden", name: "flow" }),
      ]),
    ).toBe(false);
  });

  it("returns true for a visible identifier field", () => {
    expect(
      loginFlowHasVisibleInteractiveNodes([
        inputNode({ type: "text", name: "identifier" }),
      ]),
    ).toBe(true);
  });

  it("returns true for totp second-factor field", () => {
    expect(
      loginFlowHasVisibleInteractiveNodes([
        inputNode({ type: "hidden", name: "csrf_token" }),
        inputNode({ group: "totp", type: "text", name: "totp_code" }),
      ]),
    ).toBe(true);
  });
});
