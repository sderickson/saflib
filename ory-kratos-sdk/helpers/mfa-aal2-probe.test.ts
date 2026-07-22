import { beforeEach, describe, expect, it } from "vitest";
import type { UiNode } from "@ory/client";
import { setClientName } from "@saflib/links";
import {
  aal2LoginFlowHasMfaMethods,
  resolveMfaContinueHref,
  sessionSatisfiesMfa,
} from "./mfa-aal2-probe.ts";

function inputNode(name: string, type: string): UiNode {
  return {
    type: "input",
    group: "default",
    attributes: {
      node_type: "input",
      name,
      type,
      value: "",
      required: false,
      disabled: false,
    },
    messages: [],
    meta: {},
  } as UiNode;
}

describe("aal2LoginFlowHasMfaMethods", () => {
  it("is false when only hidden csrf/method fields exist", () => {
    expect(
      aal2LoginFlowHasMfaMethods([
        inputNode("csrf_token", "hidden"),
        inputNode("method", "hidden"),
      ]),
    ).toBe(false);
    expect(aal2LoginFlowHasMfaMethods([])).toBe(false);
    expect(aal2LoginFlowHasMfaMethods(undefined)).toBe(false);
  });

  it("is true when a totp or code field is present", () => {
    expect(
      aal2LoginFlowHasMfaMethods([
        inputNode("csrf_token", "hidden"),
        inputNode("totp_code", "text"),
      ]),
    ).toBe(true);
  });
});

describe("resolveMfaContinueHref", () => {
  beforeEach(() => {
    setClientName("auth");
  });

  it("sends users with MFA methods to the login flow", () => {
    const href = resolveMfaContinueHref(
      {
        id: "flow-aal2",
        ui: {
          action: "",
          method: "POST",
          nodes: [inputNode("totp_code", "text")],
        },
      },
      "http://account.localhost/mfa",
    );
    expect(href).toContain("/login");
    expect(href).toContain("flow=flow-aal2");
  });

  it("sends users without MFA methods to the setup href", () => {
    const href = resolveMfaContinueHref(
      {
        id: "flow-empty",
        ui: {
          action: "",
          method: "POST",
          nodes: [inputNode("csrf_token", "hidden")],
        },
      },
      "http://account.localhost/mfa",
    );
    expect(href).toBe("http://account.localhost/mfa");
  });
});

describe("sessionSatisfiesMfa", () => {
  it("is true for aal2/aal3 only", () => {
    expect(sessionSatisfiesMfa("aal2")).toBe(true);
    expect(sessionSatisfiesMfa("aal3")).toBe(true);
    expect(sessionSatisfiesMfa("aal1")).toBe(false);
    expect(sessionSatisfiesMfa(undefined)).toBe(false);
  });
});
