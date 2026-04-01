import type { UiNode } from "@ory/client";
import { describe, expect, it } from "vitest";
import { kratosPasskeyRemoveButtonLabel } from "./kratosPasskeyRemoveLabel.ts";

function removeNode(
  displayName: string,
  text: string,
  addedAt?: string,
): UiNode {
  return {
    type: "input",
    group: "passkey",
    attributes: {
      name: "passkey_remove",
      type: "submit",
      value: "abc",
      disabled: false,
      node_type: "input",
    },
    messages: [],
    meta: {
      label: {
        id: 1,
        text,
        type: "info",
        context: {
          display_name: displayName,
          ...(addedAt ? { added_at: addedAt } : {}),
        },
      },
    },
  };
}

describe("kratosPasskeyRemoveButtonLabel", () => {
  it("returns null when the passkey has a real display name", () => {
    const n = removeNode("Touch ID", 'Remove passkey "Touch ID"', "2026-01-01T00:00:00Z");
    expect(
      kratosPasskeyRemoveButtonLabel(n, [n], "u@example.com"),
    ).toBeNull();
  });

  it("substitutes account email when display_name is unnamed", () => {
    const n = removeNode("unnamed", 'Remove passkey "unnamed"');
    expect(kratosPasskeyRemoveButtonLabel(n, [n], "u@example.com")).toBe(
      "Remove passkey (u@example.com)",
    );
  });

  it("disambiguates multiple unnamed passkeys with added_at", () => {
    const a = removeNode("unnamed", 'Remove passkey "unnamed"', "2026-03-28T13:55:56Z");
    const b = removeNode("unnamed", 'Remove passkey "unnamed"', "2026-03-29T10:00:00Z");
    const all = [a, b];
    const la = kratosPasskeyRemoveButtonLabel(a, all, "u@example.com");
    const lb = kratosPasskeyRemoveButtonLabel(b, all, "u@example.com");
    expect(la).toContain("u@example.com");
    expect(lb).toContain("u@example.com");
    expect(la).not.toBe(lb);
  });

  it("returns null without fallback email", () => {
    const n = removeNode("unnamed", 'Remove passkey "unnamed"');
    expect(kratosPasskeyRemoveButtonLabel(n, [n], undefined)).toBeNull();
  });
});
