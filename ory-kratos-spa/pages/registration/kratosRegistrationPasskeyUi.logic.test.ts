import { describe, it, expect } from "vitest";
import type { RegistrationFlow, UiNode } from "@ory/client";
import {
  omitRegistrationPasskeySignupNodes,
  registrationFlowHidingPasskeySignup,
} from "./kratosRegistrationPasskeyUi.logic.ts";

function passkeyTriggerNode(): UiNode {
  return {
    type: "input",
    group: "passkey",
    attributes: {
      name: "passkey_register_trigger",
      type: "button",
      disabled: false,
      onclick: "window.oryPasskeyRegistration()",
      onclickTrigger: "oryPasskeyRegistration",
      node_type: "input",
    },
    messages: [],
    meta: {
      label: {
        id: 1040007,
        text: "Sign up with passkey",
        type: "info",
      },
    },
  };
}

describe("kratosRegistrationPasskeyUi", () => {
  it("omits passkey-group nodes", () => {
    const email: UiNode = {
      type: "input",
      group: "default",
      attributes: {
        name: "traits.email",
        type: "email",
        disabled: false,
        node_type: "input",
      },
      messages: [],
      meta: {},
    };
    const out = omitRegistrationPasskeySignupNodes([email, passkeyTriggerNode()]);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(email);
  });

  it("returns the same flow reference when nothing is removed", () => {
    const flow = {
      id: "flow-1",
      ui: { nodes: [{ type: "text", group: "default" } as UiNode] },
    } as RegistrationFlow;
    expect(registrationFlowHidingPasskeySignup(flow)).toBe(flow);
  });

  it("clones flow when passkey nodes are stripped", () => {
    const flow = {
      id: "flow-1",
      ui: { nodes: [passkeyTriggerNode()] },
    } as RegistrationFlow;
    const next = registrationFlowHidingPasskeySignup(flow);
    expect(next).not.toBe(flow);
    expect(next.ui.nodes).toHaveLength(0);
  });
});
