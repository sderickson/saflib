import { describe, expect, it } from "vitest";
import type { UiNode } from "@ory/client";
import {
  REGISTRATION_TRAIT_FIELD_ORDER,
  sortRegistrationFlowNodes,
} from "./kratosRegistrationNodeOrder.logic.ts";
import { isKratosInputNode } from "../common/kratosNodeUtils.ts";

function inputNode(
  name: string,
  extra: Partial<{ type: string; group: string }> = {},
): UiNode {
  return {
    type: "input",
    group: extra.group ?? "default",
    attributes: {
      node_type: "input",
      name,
      type: extra.type ?? (name === "password" ? "password" : "text"),
      required: true,
    },
    meta: {},
  } as UiNode;
}

describe("sortRegistrationFlowNodes", () => {
  it("lists the expected canonical order constant", () => {
    expect([...REGISTRATION_TRAIT_FIELD_ORDER]).toEqual([
      "traits.name.first",
      "traits.name.last",
      "traits.email",
      "traits.phone",
      "password",
    ]);
  });

  it("orders trait fields first, last, email, phone, password when Kratos sends a different order", () => {
    const csrf = inputNode("csrf_token", { type: "hidden" });
    const email = inputNode("traits.email", { type: "email" });
    const first = inputNode("traits.name.first");
    const last = inputNode("traits.name.last");
    const phone = inputNode("traits.phone");
    const password = inputNode("password", { type: "password", group: "password" });
    const method = {
      type: "input",
      group: "password",
      attributes: {
        node_type: "input",
        name: "method",
        type: "submit",
        value: "password",
      },
      meta: {},
    } as UiNode;

    const shuffled = [csrf, email, password, first, last, phone, method];
    const sorted = sortRegistrationFlowNodes(shuffled);

    const inputNames: string[] = [];
    for (const n of sorted) {
      if (isKratosInputNode(n)) inputNames.push(n.attributes.name);
    }

    expect(inputNames).toEqual([
      "csrf_token",
      "traits.name.first",
      "traits.name.last",
      "traits.email",
      "traits.phone",
      "password",
      "method",
    ]);
  });

  it("leaves email-before-password-only mocks unchanged aside from grouping", () => {
    const csrf = inputNode("csrf_token", { type: "hidden" });
    const email = inputNode("traits.email", { type: "email" });
    const password = inputNode("password", { type: "password", group: "password" });
    const method = {
      type: "input",
      group: "password",
      attributes: {
        node_type: "input",
        name: "method",
        type: "submit",
        value: "password",
      },
      meta: {},
    } as UiNode;

    const nodes = [csrf, email, password, method];
    const sorted = sortRegistrationFlowNodes(nodes);
    expect(
      sorted.map((n) =>
        isKratosInputNode(n) ? (n.attributes.name as string) : "?",
      ),
    ).toEqual(["csrf_token", "traits.email", "password", "method"]);
  });
});
