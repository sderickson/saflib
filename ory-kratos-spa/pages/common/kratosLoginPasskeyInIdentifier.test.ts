import type { UiNode } from "@ory/client";
import { describe, expect, it } from "vitest";
import {
  filterOutMergedLoginTriggerButton,
  findPasskeyOrWebAuthnLoginTrigger,
  isPasskeyLoginTriggerButton,
  shouldMergePasskeyTriggerIntoIdentifier,
} from "./kratosLoginPasskeyInIdentifier.ts";

function input(name: string, type: string, group = "default"): UiNode {
  return {
    type: "input",
    group: group as UiNode["group"],
    attributes: {
      name,
      type,
      disabled: false,
      node_type: "input",
    },
    messages: [],
    meta: {},
  } as UiNode;
}

function passkeyTrigger(): UiNode {
  return {
    type: "input",
    group: "passkey",
    attributes: {
      name: "passkey_login_trigger",
      type: "button",
      disabled: false,
      node_type: "input",
    },
    messages: [],
    meta: {},
  } as UiNode;
}

describe("kratosLoginPasskeyInIdentifier", () => {
  it("detects passkey login trigger", () => {
    const n = passkeyTrigger();
    expect(isPasskeyLoginTriggerButton(n)).toBe(true);
  });

  it("merges only when identifier + passkey trigger exist", () => {
    const nodes = [input("csrf_token", "hidden"), input("identifier", "text"), passkeyTrigger()];
    expect(shouldMergePasskeyTriggerIntoIdentifier(true, nodes)).toBe(true);
    expect(shouldMergePasskeyTriggerIntoIdentifier(false, nodes)).toBe(false);
  });

  it("finds trigger and filters it from display list", () => {
    const trigger = passkeyTrigger();
    const nodes = [input("identifier", "text"), trigger, input("password", "password", "password")];
    expect(findPasskeyOrWebAuthnLoginTrigger(nodes)).toBe(trigger);
    const filtered = filterOutMergedLoginTriggerButton(true, nodes);
    expect(filtered).toHaveLength(2);
    expect(filtered.some((n) => isPasskeyLoginTriggerButton(n))).toBe(false);
  });
});
